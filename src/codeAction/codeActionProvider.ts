import vscode from 'vscode';
import { EXTENSION_DIAGNOSTIC_SOURCE } from '../shared';
import { EventStream } from '../common/eventStream';
import { LearnMoreClicked } from '../common/loggingEvents';
import config from '../config';

export class CodeActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
        return context.diagnostics
            .filter(diagnostic => diagnostic.source === EXTENSION_DIAGNOSTIC_SOURCE && diagnostic.code)
            .map(diagnostic => this.createCommandCodeAction(diagnostic));
    }

    public static learnMoreAboutCode(eventStream: EventStream, correlationId: string, diagnosticErrorCode: string) {
        eventStream.post(new LearnMoreClicked(correlationId, diagnosticErrorCode));
        vscode.env.openExternal(vscode.Uri.parse(`${config.LogCodeServiceEndpoint}?logcode=${diagnosticErrorCode}`));
    }

    private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction(`Learn more about '${diagnostic.code}'`, vscode.CodeActionKind.QuickFix);
        action.command = {
            command: 'learnMore',
            title: `Learn more about the error code '${diagnostic.code}'`,
            tooltip: `This will open the documentation for the error code '${diagnostic.code}'.`,
            arguments: [diagnostic.code]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        return action;
    }
}