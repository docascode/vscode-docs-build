import * as vscode from 'vscode';
import * as path from 'path';

export interface DiagnosticItem {
    readonly filePath: string;
    readonly diagnostic: vscode.Diagnostic;
}

export class DiagnosticController implements vscode.Disposable {
    private docsDiagnostics: vscode.DiagnosticCollection;

    constructor() {
        this.docsDiagnostics = vscode.languages.createDiagnosticCollection('Docs');
    }

    public reset() {
        this.docsDiagnostics.clear();
    }

    public setDiagnostic(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]) {
        this.docsDiagnostics.set(uri, diagnostics);
    }

    public addDiagnostic(diagnosticItem: DiagnosticItem) {
        if (diagnosticItem) {
            let uri = vscode.Uri.file(path.resolve(vscode.workspace.rootPath!, diagnosticItem.filePath));
            this.docsDiagnostics.set(uri, [...this.docsDiagnostics.get(uri)!!, diagnosticItem.diagnostic]);
        }
    }

    public getDiagnostic(uri: vscode.Uri): readonly vscode.Diagnostic[] {
        return this.docsDiagnostics.get(uri);
    }

    public deleteDiagnostic(uri: vscode.Uri) {
        this.docsDiagnostics.delete(uri);
    }

    public dispose(): void {
        this.docsDiagnostics.dispose();
    }
}