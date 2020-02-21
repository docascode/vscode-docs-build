import vscode from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';
import { CredentialController } from './credential/credentialController';
import { uriHandler, EXTENSION_ID } from './shared';
import { PlatformInformation } from './common/platformInformation';
import { ensureRuntimeDependencies } from './dependency/dependencyManager';
import { SignStatusBarObserver } from './observers/signStatusBarObserver';
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
import { QuickPickTriggered, QuickPickCommandSelected } from './common/loggingEvents';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    const eventStream = new EventStream();
    const extensionContext = new ExtensionContext(context);
    const environmentController = new DocsEnvironmentController(eventStream);
    const platformInformation = await PlatformInformation.getCurrent();

    // Telemetry
    const telemetryReporter = getTelemetryReporter(extensionContext, environmentController);
    const telemetryObserver = new TelemetryObserver(telemetryReporter);
    eventStream.subscribe(telemetryObserver.eventHandler);

    // Output Channel
    const outputChannel = vscode.window.createOutputChannel('Docs Validation');
    const docsOutputChannelObserver = new DocsOutputChannelObserver(outputChannel);
    const docsLoggerObserver = new DocsLoggerObserver(outputChannel);
    eventStream.subscribe(docsLoggerObserver.eventHandler);
    eventStream.subscribe(docsOutputChannelObserver.eventHandler);

    let runtimeDependenciesInstalled = await ensureRuntimeDependencies(extensionContext, platformInformation, eventStream);
    if (!runtimeDependenciesInstalled) {
        throw new Error('Install runtime dependencies failed, Please restart Visual Studio Code to re-trigger the download.');
    }

    // Message 
    let errorMessageObserver = new ErrorMessageObserver();
    let infoMessageObserver = new InfoMessageObserver();
    eventStream.subscribe(errorMessageObserver.eventHandler);
    eventStream.subscribe(infoMessageObserver.eventHandler);

    // Credential component initialize
    let keyChain = new KeyChain(environmentController);
    let credentialController = new CredentialController(keyChain, eventStream, environmentController);
    eventStream.subscribe(credentialController.eventHandler);
    // Initialize credential
    let credentialInitialPromise = credentialController.initialize();

    // Sign Status bar
    let signStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Number.MIN_VALUE + 1);
    let signStatusBarObserver = new SignStatusBarObserver(signStatusBar, environmentController);
    eventStream.subscribe(signStatusBarObserver.eventHandler);

    // Build component initialize
    let diagnosticController = new DiagnosticController();
    let buildController = new BuildController(extensionContext, environmentController, platformInformation, diagnosticController, eventStream);

    // Build status bar
    let buildStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Number.MIN_VALUE);
    let buildStatusBarObserver = new BuildStatusBarObserver(buildStatusBar);
    eventStream.subscribe(buildStatusBarObserver.eventHandler);

    let codeActionProvider = new CodeActionProvider();

    context.subscriptions.push(
        outputChannel,
        telemetryReporter,
        diagnosticController,
        signStatusBar,
        buildStatusBar,
        environmentController,
        // TODO: Support cancel the current build
        vscode.commands.registerCommand('docs.signIn', () => credentialController.signIn(getCorrelationId())),
        vscode.commands.registerCommand('docs.signOut', () => credentialController.signOut(getCorrelationId())),
        vscode.commands.registerCommand('docs.build', (uri) => {
            buildController.build(getCorrelationId(), uri, credentialController.credential);
        }),
        vscode.commands.registerCommand('learnMore', (diagnosticErrorCode: string) => {
            CodeActionProvider.learnMoreAboutCode(eventStream, getCorrelationId(), diagnosticErrorCode);
        }),
        vscode.commands.registerCommand('docs.validationQuickPick', () => createQuickPickMenu(getCorrelationId(), eventStream, credentialController, buildController)),
        vscode.languages.registerCodeActionsProvider('*', codeActionProvider, {
            providedCodeActionKinds: CodeActionProvider.providedCodeActionKinds
        }),
        vscode.window.registerUriHandler(uriHandler)
    );

    return {
        initializationFinished: async () => {
            await credentialInitialPromise;
        },
        eventStream,
        keyChain
    };
}

function getTelemetryReporter(context: ExtensionContext, environmentController: EnvironmentController) {
    let key = config.AIKey[environmentController.env];
    return new TelemetryReporter(EXTENSION_ID, context.extensionVersion, key);
}

function createQuickPickMenu(correlationId: string, eventStream: EventStream, credentialController: CredentialController, buildController: BuildController) {
    eventStream.post(new QuickPickTriggered(correlationId));
    const quickPickMenu = vscode.window.createQuickPick();
    const currentSignInStatus = credentialController.credential.signInStatus;
    if (currentSignInStatus === 'SignedOut') {
        quickPickMenu.items = <vscode.QuickPickItem[]>[
            {
                label: 'Sign-in',
                description: 'Sign-in to Docs Build',
                picked: true
            },
        ];
    } else if (currentSignInStatus === 'SignedIn') {
        quickPickMenu.items = <vscode.QuickPickItem[]>[
            {
                label: 'Sign-out',
                description: 'Sign-out from Docs Build',
                picked: true
            },
            {
                label: 'Build',
                description: 'Trigger a build'
            }
        ];
    }
    quickPickMenu.onDidChangeSelection(selection => {
        if (selection[0]) {
            eventStream.post(new QuickPickCommandSelected(correlationId, selection[0].label));
            switch (selection[0].label) {
                case 'Sign-in':
                    credentialController.signIn(getCorrelationId());
                    break;
                case 'Sign-out':
                    credentialController.signOut(getCorrelationId());
                    break;
                case 'Build':
                    buildController.build(getCorrelationId(), undefined, credentialController.credential);
                    break;
            }
            quickPickMenu.hide();
        }
    });
    quickPickMenu.onDidHide(() => quickPickMenu.dispose());
    quickPickMenu.show();
}

export function deactivate() { }
