import * as vscode from 'vscode';

// Extension
export const EXTENSION_NAME = 'docs-build';

export const EXTENSION_ID = `ceapex.${EXTENSION_NAME}`;

const extension = vscode.extensions.getExtension(EXTENSION_ID);

export const PACKAGE_JSON = extension.packageJSON;

export const EXTENSION_PATH = extension.extensionPath;

// Environment

export type Environment = 'PROD' | 'PPE';

export class MessageAction implements vscode.MessageItem {
    constructor(public title: string, public command?: string, public description?: string, public callback?: Function, public args?: any[]) { }
}