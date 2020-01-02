import * as vscode from 'vscode';
import { EventType } from '../common/EventType';
import { BaseEvent, UserSignInFailed } from '../common/loggingEvents';
import { MessageAction } from '../shared';

export class ErrorMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInFailed:
                let asUserSignInFailed = <UserSignInFailed>event;
                this.showErrorMessage(`Sign-In failed: ${asUserSignInFailed.message}`);
                break;
            case EventType.CredentialExpired:
                this.handleCredentialExpired();
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

    private handleCredentialExpired() {
        let message = `Credential has expired. Please sign-in again to continue.`;
        let messageAction = new MessageAction('Sign-in', 'docs.signIn');
        this.showErrorMessage(message, messageAction);
    }
}
