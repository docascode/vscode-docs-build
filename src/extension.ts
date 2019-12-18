import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
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
