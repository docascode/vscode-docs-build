import vscode from 'vscode';

import { EnvironmentController } from '../common/environmentController';
import { EventType } from '../common/eventType';
import { BaseEvent, BuildCompleted,UserSignInCompleted, UserSignOutCompleted } from '../common/loggingEvents';
import { EXTENSION_NAME, MessageAction, USER_TYPE, UserType } from '../shared';

export class InfoMessageObserver {
    constructor(private _environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent): void => {
        let asUserSignInCompleted;
        switch (event.type) {
            case EventType.UserSignInCompleted:
                asUserSignInCompleted = <UserSignInCompleted>event;
                if (asUserSignInCompleted.succeeded && !asUserSignInCompleted.retrievedFromCache) {
                    if (asUserSignInCompleted.signInReason === 'RealTimeValidation') {
                        this.showInfoMessage('Successfully signed in!');
                    } else {
                        this.showInfoMessage('Successfully signed in!', new MessageAction('Validate', 'docs.build', 'Would you like to validate the current repository?'));
                    }
                }
                break;
            case EventType.UserSignOutCompleted:
                if ((<UserSignOutCompleted>event).succeeded) {
                    this.showInfoMessage('Successfully signed out!');
                }
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === 'Succeeded') {
                    this.handleBuildJobSucceeded();
                }
                break;
            case EventType.ExtensionActivated:
                this.handleExtensionActivated();
                break;
        }
    }

    private async showInfoMessage(message: string, ...actions: MessageAction[]) {
        let infoMsg = `[Docs Validation] ${message}`;
        actions.forEach((action) => {
            if (action && action.description) {
                infoMsg += ` ${action.description}`;
            }
        });
        const input = <MessageAction>(await vscode.window.showInformationMessage(infoMsg, ...actions));
        if (input) {
            if (input.command) {
                vscode.commands.executeCommand(input.command, undefined);
            } else if (input.callback) {
                input.callback(input.args);
            }
        }
    }

    private handleBuildJobSucceeded() {
        this.showInfoMessage(
            `Build finished. Please open the 'Problem' panel to see the results`,
            new MessageAction(
                "Open",
                'workbench.actions.view.problems'
            ));
    }

    private handleExtensionActivated() {
        if (this._environmentController.userType === UserType.Unknown) {
            this.showInfoMessage(
                `Are you a Microsoft employee or a public contributor? We need this information to provide a better validation experience. ` +
                `You can change your selection later if needed in the extension settings (Docs validation -> User type).`,
                new MessageAction(
                    "Microsoft employee",
                    undefined,
                    undefined,
                    () => {
                        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
                        extensionConfig.update(USER_TYPE, UserType.MicrosoftEmployee, true);
                    }
                ),
                new MessageAction(
                    "Public contributor",
                    undefined,
                    undefined,
                    () => {
                        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
                        extensionConfig.update(USER_TYPE, UserType.PublicContributor, true);
                    }
                ));
        }
    }
}