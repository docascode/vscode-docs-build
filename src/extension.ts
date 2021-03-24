import { ExecSyncOptionsWithStringEncoding } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import vscode, { Uri } from 'vscode';

import { BuildController } from './build/buildController';
import { BuildExecutor } from './build/buildExecutor';
import { DiagnosticController } from './build/diagnosticController';
import { LanguageServerManager } from './build/languageServerManager';
import { OPBuildAPIClient } from './build/opBuildAPIClient';
import { CodeActionProvider } from './codeAction/codeActionProvider';
import { DocsEnvironmentController } from './common/docsEnvironmentController';
import { DocsLogger } from './common/docsLogger';
import { EnvironmentController } from './common/environmentController';
import { EventStream } from './common/eventStream';
import ExtensionExports from './common/extensionExport';
import { ExtensionActivated, QuickPickCommandSelected, QuickPickTriggered, TriggerCommandWithUnknownUserType } from './common/loggingEvents';
import { PlatformInformation } from './common/platformInformation';
import config from './config';
import { CredentialController } from './credential/credentialController';
import { KeyChain } from './credential/keyChain';
import { ensureRuntimeDependencies } from './dependency/dependencyManager';
import { ExtensionContext } from './extensionContext';
import { BuildStatusBarObserver } from './observers/buildStatusBarObserver';
import { DocsLoggerObserver } from './observers/docsLoggerObserver';
import { DocsOutputChannelObserver } from './observers/docsOutputChannelObserver';
import { DocsStatusBarObserver } from './observers/docsStatusBarObserver';
import { ErrorMessageObserver } from './observers/errorMessageObserver';
import { InfoMessageObserver } from './observers/infoMessageObserver';
import { TelemetryObserver } from './observers/telemetryObserver';
import { EXTENSION_ID, OP_CONFIG_FILE_NAME, uriHandler, UserType } from './shared';
import TelemetryReporter from './telemetryReporter';
import { executeCommandSync } from './utils/childProcessUtils';
import { getCorrelationId, safelyReadJsonFile } from './utils/utils';

enum InvalidDocsRepoType {
    NoWorkspaceFolder,
    MultipleWorkspaceFolder,
    InvalidGitRepository,
    InvalidDocsRepositoryWithoutOpConfig,
    InvalidDocsRepositoryWithV2BuildEngine,
}

let invalidDocsRepoType: InvalidDocsRepoType;
let buildExecutor: BuildExecutor;

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    const docsRepositoryRoot = getValidDocsRepositoryRoot();
    if (docsRepositoryRoot) {
        return _activate(context, docsRepositoryRoot);
    } else {
        return errorHandleActivate(context);
    }
}

async function _activate(context: vscode.ExtensionContext, repositoryRoot: string): Promise<ExtensionExports> {
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
    buildExecutor = new BuildExecutor(extensionContext, platformInformation, environmentController, eventStream, telemetryReporter);
    const buildController = new BuildController(repositoryRoot, buildExecutor, opBuildAPIClient, diagnosticController, environmentController, eventStream, credentialController);

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
        vscode.commands.registerCommand('docs.build', (uri: Uri) => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                buildController.build(getCorrelationId(), uri ?? getCurrentWorkspaceUri());
            }
        }),
        vscode.commands.registerCommand('docs.build.fullRepo', (uri: Uri) => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                buildController.build(getCorrelationId());
            }
        }),
        vscode.commands.registerCommand('docs.cancelBuild', () => buildController.cancelBuild()),
        vscode.commands.registerCommand('learnMore', (diagnosticErrorCode: string, documentUrl: Uri) => {
            CodeActionProvider.learnMoreAboutCode(eventStream, getCorrelationId(), diagnosticErrorCode, documentUrl);
        }),
        vscode.commands.registerCommand('docs.validationQuickPick', () => {
            if (checkIfUserTypeSelected(environmentController, eventStream)) {
                createQuickPickMenu(getCorrelationId(), eventStream, credentialController, buildController, environmentController);
            }
        }),
        vscode.commands.registerCommand('docs.openInstallationDirectory', () => {
            vscode.commands.executeCommand('revealFileInOS', Uri.file(path.resolve(context.extensionPath, '.logs')));
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
        eventStream.post(new ExtensionActivated(environmentController.userType, vscode.env.sessionId));
    });

    return {
        initializationFinished: async () => {
            await credentialInitialPromise;
        },
        eventStream,
        keyChain,
        environmentController,
        diagnosticController
    };
}

function getValidDocsRepositoryRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        invalidDocsRepoType = InvalidDocsRepoType.NoWorkspaceFolder;
        return undefined;
    }

    if (workspaceFolders.length > 1) {
        invalidDocsRepoType = InvalidDocsRepoType.MultipleWorkspaceFolder;
        return undefined;
    }

    const workspaceFolder = workspaceFolders[0];

    try {
        let gitRoot = executeCommandSync('git', ['rev-parse --show-toplevel'], <ExecSyncOptionsWithStringEncoding>{ cwd: workspaceFolder.uri.fsPath }).replace(/[\r\n]+$/, '');
        const opConfigPath = path.join(path.normalize(gitRoot), OP_CONFIG_FILE_NAME);
        if (!fs.existsSync(opConfigPath)) {
            invalidDocsRepoType = InvalidDocsRepoType.InvalidDocsRepositoryWithoutOpConfig;
            return undefined;
        }

        const opConfig = safelyReadJsonFile(opConfigPath);
        if (opConfig.docs_build_engine && opConfig.docs_build_engine.name === 'docfx_v2') {
            invalidDocsRepoType = InvalidDocsRepoType.InvalidDocsRepositoryWithV2BuildEngine;
            return undefined;
        }

        // If device is a drive letter, normalize to lower case.
        // Reference this issue for more detail: https://github.com/microsoft/vscode/issues/104387
        if (gitRoot && gitRoot.charAt(1) === ':') {
            gitRoot = gitRoot[0].toLowerCase() + gitRoot.substr(1);
        }
        return gitRoot;
    } catch (error) {
        invalidDocsRepoType = InvalidDocsRepoType.InvalidGitRepository;
        return undefined;
    }
}

async function errorHandleActivate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    context.subscriptions.push(
        vscode.commands.registerCommand('docs.signIn', reportInvalidDocsRepository),
        vscode.commands.registerCommand('docs.signOut', reportInvalidDocsRepository),
        vscode.commands.registerCommand('docs.build', reportInvalidDocsRepository),
        vscode.commands.registerCommand('docs.build.fullRepo', reportInvalidDocsRepository),
        vscode.commands.registerCommand('docs.cancelBuild', reportInvalidDocsRepository),
        vscode.commands.registerCommand('docs.validationQuickPick', reportInvalidDocsRepository),
        vscode.commands.registerCommand('docs.openInstallationDirectory', () => {
            vscode.commands.executeCommand('revealFileInOS', Uri.file(path.resolve(context.extensionPath, '.logs')));
        }),
    );

    return {
        initializationFinished: undefined,
        eventStream: undefined,
        keyChain: undefined,
        environmentController: undefined,
        diagnosticController: undefined,
    };

    function reportInvalidDocsRepository(): void {
        let errorMessage: string;
        switch (invalidDocsRepoType) {
            case InvalidDocsRepoType.NoWorkspaceFolder:
                errorMessage = 'Please open a workspace folder and retry.';
                break;
            case InvalidDocsRepoType.MultipleWorkspaceFolder:
                errorMessage = 'Validation is triggered on a workspace that contains multiple folders, please close other folders and only keep one in the current workspace';
                break;
            case InvalidDocsRepoType.InvalidGitRepository:
                errorMessage = 'Validation is triggered on a invalid git repository, Please open a git repository and retry';
                break;
            case InvalidDocsRepoType.InvalidDocsRepositoryWithoutOpConfig:
                errorMessage = `Cannot find '${OP_CONFIG_FILE_NAME} ' file under git root folder of the opening workspace folder, please open a valid Docs repository and retry`;
                break;
            case InvalidDocsRepoType.InvalidDocsRepositoryWithV2BuildEngine:
                errorMessage = `Docs Validation Extension requires the repository has DocFX v3 enabled`;
                break;
        }
        vscode.window.showErrorMessage(errorMessage);
    }
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
                label: '$(debug-start) Validate the current workspace',
                description: 'Trigger a validation on current workspace'
            });
        pickItems.push(
            {
                label: '$(debug-start) Validate the whole repository',
                description: 'Trigger a validation on the whole repository'
            });
    } else {
        pickItems.push(
            {
                label: '$(debug-stop) Cancel Build',
                description: 'Cancel the current validation'
            });
    }

    quickPickMenu.placeholder = 'Which command would you like to run?';
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
                case '$(debug-start) Validate the current workspace':
                    buildController.build(getCorrelationId(), getCurrentWorkspaceUri());
                    break;
                case '$(debug-start) Validate the whole repository':
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

function getCurrentWorkspaceUri() {
    return vscode.workspace.workspaceFolders[0].uri;
}

export async function deactivate(): Promise<void> {
    if (buildExecutor) {
        await buildExecutor.disposeAsync();
    }
}
