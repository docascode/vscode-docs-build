import assert from 'assert';
import vscode, { Diagnostic, DiagnosticSeverity, Range, Uri } from 'vscode';

import ExtensionExports from '../../src/common/extensionExport';
import { EXTENSION_ID } from '../../src/shared';

export interface DiagnosticInfo {
    range: Range;
    message: string;
    code: string;
    severity: DiagnosticSeverity;
}

export const fileNotFoundWarning = <DiagnosticInfo>{
    range: new Range(7, 0, 7, 0),
    message: `Invalid file link: 'a.md'.`,
    severity: vscode.DiagnosticSeverity.Warning,
    code: 'file-not-found',
}

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

export function assertDiagnostics(expected: { [key: string]: DiagnosticInfo[]; }): void {
    Object.entries(expected).forEach(([file, expectedDiagnostics]) => {
        const fileUri = Uri.file(file);
        const diagnostics = vscode.languages.getDiagnostics(fileUri);
        assertDiagnostic(diagnostics, expectedDiagnostics);
    });
}

export function assertDiagnostic(actualDiagnostics: Diagnostic[], expectedDiagnosticInfos: DiagnosticInfo[]): void {
    const expectedDiagnostics: Diagnostic[] = [];
    expectedDiagnosticInfos.forEach((item) => {
        const diagnostic = new Diagnostic(item.range, item.message, item.severity);
        diagnostic.code = item.code;
        diagnostic.source = 'Docs Validation';
        expectedDiagnostics.push(diagnostic);
    });
    assert.deepStrictEqual(actualDiagnostics, expectedDiagnostics);
}