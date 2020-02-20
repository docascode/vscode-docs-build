import vscode from 'vscode';
import { EXTENSION_DIAGNOSTIC_SOURCE } from '../shared';
import { EventStream } from '../common/eventStream';
import { LearnMoreClicked } from '../common/loggingEvents';

export class CodeActionProvider implements vscode.CodeActionProvider {

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
        return context.diagnostics
            .filter(diagnostic => diagnostic.source === EXTENSION_DIAGNOSTIC_SOURCE && diagnostic.code)
            .map(diagnostic => this.createCommandCodeAction(diagnostic));
    }

    public static learnMoreAboutCode(eventStream: EventStream, correlationId: string, code: string) {
        eventStream.post(new LearnMoreClicked(correlationId, code));
        vscode.env.openExternal(vscode.Uri.parse(`https://aka.ms/${code}`));
    }

    private createCommandCodeAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.QuickFix);
        action.command = {
            command: 'learnMore',
            title: 'Learn more about this error code',
            tooltip: 'This will open the error code detail page.',
            arguments: [diagnostic.code]
            // arguments: [vscode.Uri.parse(`https://aka.ms/${diagnostic.code}`)]
        };
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        return action;
    }
}