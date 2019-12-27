import * as vscode from 'vscode';
import { ensureRuntimeDependencies } from './dependency/dependencyManager';
import { PlatformInformation } from './common/PlatformInformation';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    let platformInformation = await PlatformInformation.getCurrent();
    let runtimeDependenciesInstalled = await ensureRuntimeDependencies(platformInformation);
    if (!runtimeDependenciesInstalled) {
        throw new Error("Install runtime dependencies failed, Please restart Visual Studio Code to re-trigger the download.");
    }

    context.subscriptions.push(
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
}

export function deactivate() { }
