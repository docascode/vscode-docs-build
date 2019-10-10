import * as vscode from 'vscode';
import * as path from 'path';

export interface diagnosticItem {
    readonly filePath: string,
    readonly diagnostic: vscode.Diagnostic
}

class DiagnosticController implements vscode.Disposable {
    private docsDiagnostics: vscode.DiagnosticCollection;

    constructor() {
        this.docsDiagnostics = vscode.languages.createDiagnosticCollection('Docs');
    }

    public setDiagnostic(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]) {
        this.docsDiagnostics.set(uri, diagnostics);
    }

    public addDiagnostic(diagnosticItem: diagnosticItem | undefined) {
        if (diagnosticItem) {
            vscode.workspace.asRelativePath
            let uri = vscode.Uri.file(path.resolve(vscode.workspace.rootPath!, diagnosticItem.filePath));
            this.docsDiagnostics.set(uri, [...this.docsDiagnostics.get(uri)!!, diagnosticItem.diagnostic]);
        }
    }

    public getDiagnostic(uri: vscode.Uri): readonly vscode.Diagnostic[] | undefined {
        return this.docsDiagnostics.get(uri);
    }

    public deleteDiagnostic(uri: vscode.Uri) {
        this.docsDiagnostics.delete(uri);
    }

    public dispose(): void {
        this.docsDiagnostics.dispose();
    }
}

export const diagnosticController: DiagnosticController = new DiagnosticController();