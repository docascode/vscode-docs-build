import * as vscode from 'vscode';
import { PlatformInformation } from './common/PlatformInformation';
import { ensureRuntimeDependencies } from './dependency/dependencyManager';
import { DocsLoggerObserver } from './observers/DocsLoggerObserver';
import { DocsOutputChannelObserver } from './observers/DocsOutputChannelObserver';
import ExtensionExports from './common/ExtensionExport';
import { EventStream } from './common/EventStream';
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

    context.subscriptions.push(
        outputChannel,
        environmentController,
        vscode.commands.registerCommand('docs.signIn', () => {
            // TODO: handle sign in command
        }),
        vscode.commands.registerCommand('docs.signOut', () => {
            // TODO: handle sign out command
        }),
        vscode.commands.registerCommand('docs.build', async (uri) => {
            // TODO: handle build command
        })
    );

    return {
        initializationFinished: async () => { }
    };
}

export function deactivate() { }
