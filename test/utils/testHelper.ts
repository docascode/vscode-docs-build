import vscode from 'vscode';

import ExtensionExports from '../../src/common/extensionExport';
import { EXTENSION_ID } from '../../src/shared';

export async function ensureExtensionActivatedAndInitializationFinished(): Promise<vscode.Extension<ExtensionExports>> {
    const extension = vscode.extensions.getExtension<ExtensionExports>(EXTENSION_ID);

    if (!extension.isActive) {
        return undefined;
    }
    try {
        await extension.exports.initializationFinished();
    } catch (err) {
        console.log(JSON.stringify(err));
        return undefined;
    }
    return extension;
}

export function triggerCommand(command: string): void {
    vscode.commands.executeCommand(command);
}