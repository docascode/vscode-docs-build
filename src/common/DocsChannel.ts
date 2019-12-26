import * as vscode from 'vscode';

export class DocsChannel implements vscode.Disposable {
    private readonly channel: vscode.OutputChannel = vscode.window.createOutputChannel('Docs Validation');

    public appendLine(message?: string): void {
        this.channel.appendLine(message || "");
    }

    public append(message: string): void {
        this.channel.append(message);
    }

    public show(): void {
        this.channel.show();
    }

    public dispose(): void {
        this.channel.dispose();
    }
}