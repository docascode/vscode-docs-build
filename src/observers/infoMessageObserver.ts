import vscode from 'vscode';
import { BaseEvent, UserSignInCompleted, UserSignOutCompleted, BuildCompleted, BuildTriggered } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { MessageAction, EXTENSION_NAME, SIGN_RECOMMEND_HINT_CONFIG_NAME, USER_TYPE } from '../shared';
import { EnvironmentController } from '../common/environmentController';

export class InfoMessageObserver {
    constructor(private _environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInCompleted:
                let asUserSignInCompleted = <UserSignInCompleted>event;
                if (asUserSignInCompleted.succeeded && !asUserSignInCompleted.retrievedFromCache) {
                    this.showInfoMessage('Successfully signed in!', new MessageAction('Validate', 'docs.build', 'Would you like to validate the current workspace folder?'));
                }
                break;
            case EventType.UserSignOutCompleted:
                if ((<UserSignOutCompleted>event).succeeded) {
                    this.showInfoMessage('Successfully signed out!');
                }
                break;
            // TODO: remove this, and related classes/ objects 
            case EventType.BuildTriggered:
                this.handleBuildTriggered(<BuildTriggered>event);
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === 'Succeeded') {
                    this.handleBuildJobSucceeded();
                }
                break;
            case EventType.CheckIfInternal:
                this.checkIfInternal();
                break;
            case EventType.PublicUserSignIn:
                this.handlePublicSignIn();
                break;
            case EventType.PublicUserSignOut:
                this.handlePublicSignOut();
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

    private async showInfoMessageWithMultipleChoices(message: string, ...actions: MessageAction[]) {
        let infoMsg = `[Docs Validation] ${message}`;
        actions.forEach((action) => {
            if (action && action.description) {
                infoMsg += ` ${action.description}`;
            }
        });
        let input = <MessageAction>(await vscode.window.showInformationMessage(infoMsg, ...actions));
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

    private handleBuildTriggered(event: BuildTriggered) {
        if (!event.signedIn && this._environmentController.enableSignRecommendHint) {
            this.showInfoMessage(
                `If you are a Microsoft internal user, you are recommended to login to the Docs system by clicking 'Docs Validation' in the status bar and 'Sign-in' in command palette,`+
                ` or you may get some validation errors if some non-live data (e.g. UID, moniker) has been used.`,
                new MessageAction(
                    "Don't show this message again",
                    undefined,
                    undefined,
                    () => {
                        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
                        extensionConfig.update(SIGN_RECOMMEND_HINT_CONFIG_NAME, false, true);
                    }
                ));
        }
    }

    private checkIfInternal() {
        if (this._environmentController.userType === "undefined") {
            this.showInfoMessageWithMultipleChoices(
                `Are you an internal user?`,
                new MessageAction(
                    "Yes",
                    undefined,
                    undefined,
                    () => {
                        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
                        extensionConfig.update(USER_TYPE, "internal", true);
                    }
                ),
                new MessageAction(
                    "No",
                    undefined,
                    undefined,
                    () => {
                        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
                        extensionConfig.update(USER_TYPE, "public", true);
                    }
                ));
        }
    }

    private handlePublicSignIn() {
        this.showInfoMessage(
            `Sign in is only available for Microsoft employees`,
            new MessageAction(
                "Ok"
            ));
    } 

    private handlePublicSignOut() {
        this.showInfoMessage(
            `Sign out is only available for Microsoft employees`,
            new MessageAction(
                "Ok"
            ));
    }
}