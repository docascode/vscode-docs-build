import vscode from 'vscode';
import { safelyReadJsonFile } from './utils/utils';

export class ExtensionContext {
    public readonly packageJson: any;
    public readonly extensionPath: string;
    public readonly extensionVersion: string;

    constructor(context: vscode.ExtensionContext) {
        const packageJsonPath = context.asAbsolutePath('./package.json');
        this.packageJson = safelyReadJsonFile(packageJsonPath);
        this.extensionPath = context.extensionPath;
        this.extensionVersion = this.packageJson.version;
    }
}