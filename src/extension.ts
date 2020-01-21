import * as vscode from 'vscode';
import { CredentialController } from './credential/credentialController';
import { uriHandler } from './shared';
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

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    const eventStream = new EventStream();
    const environmentController = new DocsEnvironmentController(eventStream);
    const platformInformation = await PlatformInformation.getCurrent();

    // Output Channel
    const outputChannel = vscode.window.createOutputChannel('Docs Validation');
    const docsOutputChannelObserver = new DocsOutputChannelObserver(outputChannel);
    const docsLoggerObserver = new DocsLoggerObserver(outputChannel);
    eventStream.subscribe(docsLoggerObserver.eventHandler);
    eventStream.subscribe(docsOutputChannelObserver.eventHandler);

    let runtimeDependenciesInstalled = await ensureRuntimeDependencies(platformInformation, eventStream);
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
    let buildController = new BuildController(environmentController, platformInformation, diagnosticController, eventStream);

    // Build status bar
    let buildStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, Number.MIN_VALUE);
    let buildStatusBarObserver = new BuildStatusBarObserver(buildStatusBar);
    eventStream.subscribe(buildStatusBarObserver.eventHandler);

    context.subscriptions.push(
        outputChannel,
        diagnosticController,
        signStatusBar,
        buildStatusBar,
        environmentController,
        // TODO: Support cancel the current build
        vscode.commands.registerCommand('docs.signIn', () => credentialController.signIn()),
        vscode.commands.registerCommand('docs.signOut', () => credentialController.signOut()),
        vscode.commands.registerCommand('docs.build', async (uri) => {
            await buildController.build(uri, credentialController.credential);
        }),
        vscode.commands.registerCommand('docs.openPage', (uri: vscode.Uri) => {
            vscode.env.openExternal(uri);
        }),
        vscode.languages.registerCodeActionsProvider('*', new CodeActionProvider(), {
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

export function deactivate() { }
