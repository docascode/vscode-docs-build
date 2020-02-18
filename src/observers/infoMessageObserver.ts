import * as vscode from 'vscode';
import { BaseEvent, UserSignInCompleted } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { MessageAction } from '../shared';
export class InfoMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInCompleted:
                if ((<UserSignInCompleted>event).succeeded) {
                    this.showInfoMessage('Successfully Sign-in!', new MessageAction('Build', 'docs.build', 'Do you want to build Current workspace folder?'));
                }
                break;
            case EventType.RepositoryEnabledV3:
                this.handleRepositoryEnabledV3();
                break;
            case EventType.BuildJobSucceeded:
                this.handleBuildJobSucceeded();
                break;
        }
    }

    private async showInfoMessage(message: string, action?: MessageAction) {
        let infoMsg = `[Docs Validation] ${message}`;
        if (action && action.description) {
            infoMsg += ` ${action.description}`;
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

    private handleRepositoryEnabledV3() {
        this.showInfoMessage(
            `Repository has been migrated to DocFx V3`,
            new MessageAction('Build', 'docs.build', 'Do you want to build Current workspace folder?'));
    }

    private handleBuildJobSucceeded() {
        this.showInfoMessage(
            `Build finished. Please open the 'Problem' panel to review the result`,
            new MessageAction(
                "Open",
                'workbench.actions.view.problems'
            ));
    }
}