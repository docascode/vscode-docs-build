import vscode from 'vscode';
import { BaseEvent, UserSignInCompleted, UserSignOutCompleted, BuildCompleted } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { MessageAction } from '../shared';
export class InfoMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInCompleted:
                let asUserSignInCompleted = <UserSignInCompleted>event;
                if (asUserSignInCompleted.succeeded && !asUserSignInCompleted.retrievedFromCache) {
                    this.showInfoMessage('Successfully signed in!', new MessageAction('Build', 'docs.build', 'Would you like to validate current workspace folder?'));
                }
                break;
            case EventType.UserSignOutCompleted:
                if ((<UserSignOutCompleted>event).succeeded) {
                    this.showInfoMessage('Successfully signed out!');
                }
                break;
            case EventType.RepositoryEnabledV3:
                this.handleRepositoryEnabledV3();
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === 'Succeeded') {
                    this.handleBuildJobSucceeded();
                }
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
            `Repository has enabled DocFX V3`,
            new MessageAction('Build', 'docs.build', 'Would you like to validate current workspace folder?'));
    }

    private handleBuildJobSucceeded() {
        this.showInfoMessage(
            `Build finished. Please open the 'Problem' panel to see the results`,
            new MessageAction(
                "Open",
                'workbench.actions.view.problems'
            ));
    }
}