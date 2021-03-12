import vscode, { Uri } from 'vscode';

import { EventStream } from '../common/eventStream';
import { LearnMoreClicked } from '../common/loggingEvents';
import config from '../config';
import { EXTENSION_DIAGNOSTIC_SOURCE } from '../shared';

export class CodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
        return context.diagnostics
            .filter(diagnostic => diagnostic.source === EXTENSION_DIAGNOSTIC_SOURCE && diagnostic.code)
            .map(diagnostic => this.createCommandCodeAction(diagnostic));
    }

    public static learnMoreAboutCode(eventStream: EventStream, correlationId: string, diagnosticErrorCode: string, documentUrl: Uri): void {
        eventStream.post(new LearnMoreClicked(correlationId, diagnosticErrorCode));
        vscode.env.openExternal(documentUrl);
    }

    private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        let code: string;
        let documentUrl: Uri;
        if (typeof (diagnostic.code) == "object") {
            code = diagnostic.code.value.toString();
            documentUrl = diagnostic.code.target;
        } else {
            code = diagnostic.code.toString();
            documentUrl = Uri.parse(config.DefaultCodeDocumentURL);
        }

        const action = new vscode.CodeAction(`See doc: '${code}'`, vscode.CodeActionKind.QuickFix);
        action.command = {
            command: 'learnMore',
            title: `Go to document to learn more about the error code '${diagnostic.code}'`,
            tooltip: `This will open the documentation for the error code '${diagnostic.code}'.`,
            arguments: [code, documentUrl]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        return action;
    }
}