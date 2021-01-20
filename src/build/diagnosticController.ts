import path from 'path';
import vscode from 'vscode';

export interface DiagnosticItem {
    readonly filePath: string;
    readonly diagnostic: vscode.Diagnostic;
}

export class DiagnosticController implements vscode.Disposable {
    private docsDiagnostics: vscode.DiagnosticCollection;

    constructor() {
        this.docsDiagnostics = vscode.languages.createDiagnosticCollection('Docs');
    }

    public reset(): void {
        this.docsDiagnostics.clear();
    }

    public setDiagnostic(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]): void {
        this.docsDiagnostics.set(uri, diagnostics);
    }

    public addDiagnostic(diagnosticItem: DiagnosticItem): void {
        if (diagnosticItem) {
            const uri = vscode.Uri.file(path.resolve(vscode.workspace.rootPath!, diagnosticItem.filePath));
            this.docsDiagnostics.set(uri, [...this.docsDiagnostics.get(uri)!, diagnosticItem.diagnostic]);
        }
    }

    public getDiagnostic(uri: vscode.Uri): readonly vscode.Diagnostic[] {
        return this.docsDiagnostics.get(uri);
    }

    public deleteDiagnostic(uri: vscode.Uri): void {
        this.docsDiagnostics.delete(uri);
    }

    public dispose(): void {
        this.docsDiagnostics.dispose();
    }

    public setDiagnosticCollection(diagnostics: vscode.DiagnosticCollection): void {
        this.docsDiagnostics = diagnostics;
    }
}