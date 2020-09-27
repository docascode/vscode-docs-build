import vscode, { MessageItem } from 'vscode';
import ExtensionExports from './common/extensionExport';

export async function activate(context: vscode.ExtensionContext): Promise<ExtensionExports> {
    let input = await vscode.window.showInformationMessage(
        "The extension `Docs validation(ceapex)` has been republished with new publisher `docsmsft`, please move to the new extension and uninstall this one",
        <MessageItem>{
            title: "Go to install the new extension"
        }
    );
    if (input) {
        vscode.commands.executeCommand("workbench.extensions.action.installExtensions");
        vscode.env.openExternal(vscode.Uri.parse(`vscode:extension/docsmsft.docs-build`));
    }

    return undefined;
}

export function deactivate() { }
