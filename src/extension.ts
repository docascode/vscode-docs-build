import * as vscode from 'vscode';
import { CredentialController } from './credential/CredentialController';
import { uriHandler } from './shared';
import { PlatformInformation } from './common/PlatformInformation';
import { ensureRuntimeDependencies } from './dependency/dependencyManager';
import { SignStatusBarObserver } from './observers/SignStatusBarObserver';
import { DocsLoggerObserver } from './observers/DocsLoggerObserver';
import { DocsOutputChannelObserver } from './observers/DocsOutputChannelObserver';
import { ErrorMessageObserver } from './observers/ErrorMessageObserver';
import { InfoMessageObserver } from './observers/InfoMessageObserver';
import ExtensionExports from './common/ExtensionExport';
import { EventStream } from './common/EventStream';
import { KeyChain } from './credential/keyChain';
import { EnvironmentController } from './common/EnvironmentController';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    const eventStream = new EventStream();
    const environmentController = new EnvironmentController(eventStream);
    const platformInformation = await PlatformInformation.getCurrent();

    // Output Channel
    const outputChannel = vscode.window.createOutputChannel('Docs Validation');
    const docsOutputChannelObserver = new DocsOutputChannelObserver(outputChannel);
    const docsLoggerObserver = new DocsLoggerObserver(outputChannel);
    eventStream.subscribe(docsLoggerObserver.eventHandler);
    eventStream.subscribe(docsOutputChannelObserver.eventHandler);

    let runtimeDependenciesInstalled = await ensureRuntimeDependencies(platformInformation, eventStream);
    if (!runtimeDependenciesInstalled) {
        throw new Error("Install runtime dependencies failed, Please restart Visual Studio Code to re-trigger the download.");
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

    context.subscriptions.push(
        outputChannel,
        credentialController,
        environmentController,
        vscode.commands.registerCommand('docs.signIn', () => credentialController.signIn()),
        vscode.commands.registerCommand('docs.signOut', () => credentialController.signOut()),
        vscode.commands.registerCommand('docs.build', async (uri) => {
            // TODO: handle build command
        }),
        vscode.window.registerUriHandler(uriHandler)
    );

    return {
        initializationFinished: async () => {
            await credentialInitialPromise;
        }
    };
}

export function deactivate() { }
