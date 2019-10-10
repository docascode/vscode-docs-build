import * as vscode from 'vscode';
import { credentialController } from './credential/credentialController';
import { statusBarController } from './statusbar/statusBarController';
import { uriHandler } from './common/uri';
import { buildController } from './build/buildController';
import { docsChannel } from './common/docsChannel';
import { codeActionProvider } from './codeAction/codeActionProvider';
import { docsBuildExcutor } from './build/docsBuildExcutor';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    docsChannel.appendLine("Checking Extension running environment...");
    if(!(await docsBuildExcutor.checkEnvironment())){
        throw new Error("The environment doesn't meet requirements.");
    }

    await credentialController.initialize();
    
    context.subscriptions.push(
        credentialController,
        statusBarController,
        buildController,
        docsChannel,
        vscode.commands.registerCommand('docs.signIn', () => credentialController.signIn()),
        vscode.commands.registerCommand('docs.signOut', () => credentialController.signOut()),
        vscode.commands.registerCommand('docs.build', async (uri) => { await buildController.build(uri) }),
        vscode.commands.registerCommand('docs.openPage', () => vscode.env.openExternal(vscode.Uri.parse('https://github.com/dotnet/docfx/blob/v3/src/docfx/Errors.cs#L211'))),
        vscode.languages.registerCodeActionsProvider('markdown', new codeActionProvider(), {
            providedCodeActionKinds: codeActionProvider.providedCodeActionKinds
        }),
        vscode.window.registerUriHandler(uriHandler)
    );
}

export function deactivate() { }
