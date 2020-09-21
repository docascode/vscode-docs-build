import vscode from 'vscode';
import { EventType } from '../common/eventType';
import { BaseEvent, UserSignInFailed, UserSignInCompleted, UserSignOutCompleted, UserSignOutFailed, BuildCompleted, BuildFailed } from '../common/loggingEvents';
import { MessageAction } from '../shared';
import { ErrorCode } from '../error/errorCode';
import { DocsError } from '../error/docsError';
import { DocfxExecutionResult } from '../build/buildResult';

export class ErrorMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInCompleted:
                if (!(<UserSignInCompleted>event).succeeded) {
                    let asUserSignInFailed = <UserSignInFailed>event;
                    this.showErrorMessage(`Signing in failed: ${asUserSignInFailed.err.message}`);
                }
                break;
            case EventType.UserSignOutCompleted:
                if (!(<UserSignOutCompleted>event).succeeded) {
                    let asUserSignOutFailed = <UserSignOutFailed>event;
                    this.showErrorMessage(`Signing out failed: ${asUserSignOutFailed.err.message}`);
                }
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === DocfxExecutionResult.Failed) {
                    this.handleBuildFailed(<BuildFailed>event);
                }
                break;
        }
    }

    private async showErrorMessage(message: string, action?: MessageAction) {
        let infoMsg = `[Docs Validation] ${message}`;
        if (action && action.description) {
            infoMsg += `\n${action.description}`;
        }
        let input = <MessageAction>(await vscode.window.showErrorMessage(infoMsg, action));
        if (input) {
            if (input.command) {
                vscode.commands.executeCommand(input.command, undefined);
            } else if (input.callback) {
                input.callback(input.args);
            }
        }
    }

    private handleBuildFailed(event: BuildFailed) {
        let action: MessageAction;
        let error = <DocsError>event.err;
        switch (error.code) {
            case ErrorCode.TriggerBuildWithCredentialExpired:
                action = new MessageAction('Sign in', 'docs.signIn');
                break;
        }
        this.showErrorMessage(`Validation of current workspace failed (${event.err.message}). Please check the channel output for details`, action);
    }
}
