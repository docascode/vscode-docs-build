import vscode, { Uri } from 'vscode';
import * as path from 'path';
import { CredentialController } from './credential/credentialController';
import { uriHandler, EXTENSION_ID, UserType } from './shared';
import { PlatformInformation } from './common/platformInformation';
import { ensureRuntimeDependencies } from './dependency/dependencyManager';
import { DocsStatusBarObserver } from './observers/docsStatusBarObserver';
import { DocsLoggerObserver } from './observers/docsLoggerObserver';
import { DiagnosticController } from './build/diagnosticController';
import { BuildController } from './build/buildController';
import { DocsOutputChannelObserver } from './observers/docsOutputChannelObserver';
import { ErrorMessageObserver } from './observers/errorMessageObserver';
import { InfoMessageObserver } from './observers/infoMessageObserver';
import ExtensionExports from './common/extensionExport';
import { EventStream } from './common/eventStream';
import { KeyChain } from './credential/keyChain';
import { DocsEnvironmentController } from './common/docsEnvironmentController';
import { BuildStatusBarObserver } from './observers/buildStatusBarObserver';
import { CodeActionProvider } from './codeAction/codeActionProvider';
import { ExtensionContext } from './extensionContext';
import config from './config';
import { EnvironmentController } from './common/environmentController';
import { TelemetryObserver } from './observers/telemetryObserver';
import { getCorrelationId } from './utils/utils';
import { QuickPickTriggered, QuickPickCommandSelected, ExtensionActivated, TriggerCommandWithUnknownUserType } from './common/loggingEvents';
import TelemetryReporter from './telemetryReporter';
import { OPBuildAPIClient } from './build/opBuildAPIClient';
import { BuildExecutor } from './build/buildExecutor';
import { DocsLogger } from './common/docsLogger';
import { LanguageServerManager } from './build/languageServerManager';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    const eventStream = new EventStream();
    const extensionContext = new ExtensionContext(context);
    const environmentController = await DocsEnvironmentController.CreateAsync(eventStream);
    const platformInformation = await PlatformInformation.getCurrent();

    // Telemetry
    const telemetryReporter = getTelemetryReporter(extensionContext, environmentController);
    const telemetryObserver = new TelemetryObserver(telemetryReporter);
    eventStream.subscribe(telemetryObserver.eventHandler);

    // Output Channel and logger
    const outputChannel = vscode.window.createOutputChannel('Docs Validation');
    const docsOutputChannelObserver = new DocsOutputChannelObserver(outputChannel);

    const logger = new DocsLogger(outputChannel, extensionContext, environmentController);
    const docsLoggerObserver = new DocsLoggerObserver(logger);
    eventStream.subscribe(docsLoggerObserver.eventHandler);
    eventStream.subscribe(docsOutputChannelObserver.eventHandler);

    const runtimeDependenciesInstalled = await ensureRuntimeDependencies(extensionContext, getCorrelationId(), platformInformation, eventStream);
    if (!runtimeDependenciesInstalled) {
        throw new Error('Installation of run-time dependencies failed. Please restart Visual Studio Code to re-trigger the installation.');
    }

    // Message 
    const errorMessageObserver = new ErrorMessageObserver();
    const infoMessageObserver = new InfoMessageObserver(environmentController);
    eventStream.subscribe(errorMessageObserver.eventHandler);
    eventStream.subscribe(infoMessageObserver.eventHandler);

    // Credential component initialize
    const keyChain = new KeyChain(environmentController);
    const credentialController = new CredentialController(keyChain, eventStream, environmentController);
    eventStream.subscribe(credentialController.eventHandler);

    // Docs Status bar
    const docsStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Number.MIN_VALUE + 1);
    const docsStatusBarObserver = new DocsStatusBarObserver(docsStatusBar, environmentController);
    eventStream.subscribe(docsStatusBarObserver.eventHandler);

    // Build component initialize
    const diagnosticController = new DiagnosticController();
    const opBuildAPIClient = new OPBuildAPIClient(environmentController);
    const buildExecutor = new BuildExecutor(extensionContext, platformInformation, environmentController, eventStream, telemetryReporter);
    const buildController = new BuildController(buildExecutor, opBuildAPIClient, diagnosticController, environmentController, eventStream, credentialController);

    // Build status bar
    const buildStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Number.MIN_VALUE);
    const buildStatusBarObserver = new BuildStatusBarObserver(buildStatusBar);
    eventStream.subscribe(buildStatusBarObserver.eventHandler);

    const codeActionProvider = new CodeActionProvider();

    // Start language server
    const languageServerManager = new LanguageServerManager(environmentController, buildController);
    eventStream.subscribe(languageServerManager.eventHandler);

    context.subscriptions.push(
        outputChannel,
        logger,
        telemetryReporter,
        diagnosticController,
        buildController,
        docsStatusBar,
        buildStatusBar,
        environmentController,
        vscode.commands.registerCommand('docs.signIn', () => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                credentialController.signIn(getCorrelationId());
            }
        }),
        vscode.commands.registerCommand('docs.signOut', () => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                credentialController.signOut(getCorrelationId());
            }
        }),
        vscode.commands.registerCommand('docs.build', () => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                buildController.build(getCorrelationId());
            }
        }),
        vscode.commands.registerCommand('docs.cancelBuild', () => buildController.cancelBuild()),
        vscode.commands.registerCommand('learnMore', (diagnosticErrorCode: string) => {
            CodeActionProvider.learnMoreAboutCode(eventStream, getCorrelationId(), diagnosticErrorCode);
        }),
        vscode.commands.registerCommand('docs.validationQuickPick', () => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                createQuickPickMenu(getCorrelationId(), eventStream, credentialController, buildController, environmentController);
            }
        }),
        vscode.commands.registerCommand('docs.enableRealTimeValidation', () => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                languageServerManager.startLanguageServer();
            }
        }),
        vscode.commands.registerCommand('docs.openInstallationDirectory', () => {
            vscode.commands.executeCommand('revealFileInOS', Uri.file(path.resolve(context.extensionPath, ".logs")));
        }),
        vscode.languages.registerCodeActionsProvider('*', codeActionProvider, {
            providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds
        }),
        vscode.window.registerUriHandler(uriHandler)
    );

    // Initialize credential
    const credentialInitialPromise = credentialController.initialize(getCorrelationId());

    // eslint-disable-next-line promise/catch-or-return, promise/always-return
    credentialInitialPromise.then(() => {
        eventStream.post(new ExtensionActivated());
    });

    return {
        initializationFinished: async () => {
            await credentialInitialPromise;
        },
        eventStream,
        keyChain,
        environmentController
    };
}

function getTelemetryReporter(context: ExtensionContext, environmentController: EnvironmentController): TelemetryReporter {
    const key = config.AIKey[environmentController.env];
    const telemetryReporter = new TelemetryReporter(EXTENSION_ID, context.extensionVersion, key);
    return telemetryReporter;
}

function checkIfUserTypeSelected(environmentController: EnvironmentController, eventStream: EventStream): boolean {
    if (!environmentController.userType) {
        eventStream.post(new TriggerCommandWithUnknownUserType);
        return false;
    }
    return true;
}

function createQuickPickMenu(correlationId: string, eventStream: EventStream, credentialController: CredentialController, buildController: BuildController, environmentController: DocsEnvironmentController) {
    eventStream.post(new QuickPickTriggered(correlationId));
    const quickPickMenu = vscode.window.createQuickPick();
    const currentSignInStatus = credentialController.credential.signInStatus;
    const pickItems: vscode.QuickPickItem[] = [];

    if (environmentController.userType === UserType.MicrosoftEmployee) {
        if (currentSignInStatus === 'SignedOut') {
            pickItems.push(
                {
                    label: '$(sign-in) Sign-in',
                    description: 'Sign in to Docs (It is required for Microsoft employees)',
                    picked: true
                }
            );
        } else if (currentSignInStatus === 'SignedIn') {
            pickItems.push(
                {
                    label: '$(sign-out) Sign-out',
                    description: 'Sign out from Docs',
                    picked: true
                });
        }
    }
    if (buildController.instanceAvailable) {
        pickItems.push(
            {
                label: '$(debug-start) Validate',
                description: 'Trigger a validation on current repository'
            });
    } else {
        pickItems.push(
            {
                label: '$(debug-stop) Cancel Build',
                description: 'Cancel the current validation'
            });
    }

    quickPickMenu.placeholder = "Which command would you like to run?";
    quickPickMenu.items = pickItems;
    quickPickMenu.onDidChangeSelection(selection => {
        if (selection[0]) {
            eventStream.post(new QuickPickCommandSelected(correlationId, selection[0].label));
            switch (selection[0].label) {
                case '$(sign-in) Sign-in':
                    credentialController.signIn(getCorrelationId());
                    break;
                case '$(sign-out) Sign-out':
                    credentialController.signOut(getCorrelationId());
                    break;
                case '$(debug-start) Validate':
                    buildController.build(getCorrelationId());
                    break;
                case '$(debug-stop) Cancel Build':
                    buildController.cancelBuild();
                    break;
            }
            quickPickMenu.hide();
        }
    });
    quickPickMenu.onDidHide(() => quickPickMenu.dispose());
    quickPickMenu.show();
}
