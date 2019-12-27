import * as vscode from 'vscode';
import { EventType } from "../common/EventType";
import { BaseEvent, SignInFailed } from '../common/loggingEvents';
import { MessageAction } from '../common/shared';

export class ErrorMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.SignInFailed:
                let asSigninFailed = <SignInFailed>event;
                this.showErrorMessage(`SignIn failed: ${asSigninFailed.message}`);
                break;
            case EventType.CredentialExpiry:
                this.handleCredentialExpiry();
                break;
        }
    }

    private async showErrorMessage(message: string, action?: MessageAction) {
        let infoMsg = `[Docs Validation] ${message}`;
        if (action && action.desctiption) {
            infoMsg += `\n${action.desctiption}`;
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

    private handleCredentialExpiry() {
        let message = `The Credential has expiried, please Re-Sign to refresh the credentail`;
        let messageAction = new MessageAction('Sign in', 'docs.signIn');
        this.showErrorMessage(message, messageAction);
    }
}
