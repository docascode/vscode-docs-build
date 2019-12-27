import * as vscode from 'vscode';
import { BaseEvent, UserSignedIn } from "../common/loggingEvents";
import { EventType } from "../common/EventType";
import { MessageAction } from '../common/shared';
export class InfoMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignedIn:
                let asUserSignedIn = <UserSignedIn>event;
                this.showInfoMessage('Sign In Successfully!', asUserSignedIn.action);
                break;
        }
    }

    private async showInfoMessage(message: string, action?: MessageAction) {
        let infoMsg = `[Docs Validation] ${message}`;
        if (action && action.desctiption) {
            infoMsg += ` ${action.desctiption}`;
        }
        let input = <MessageAction>(await vscode.window.showInformationMessage(infoMsg, action));
        if (input) {
            if (input.command) {
                vscode.commands.executeCommand(input.command, undefined);
            } else if (input.callback) {
                input.callback(input.args);
            }
        }
    }
}