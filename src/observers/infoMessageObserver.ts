import vscode from 'vscode';
import { BaseEvent, UserSignInCompleted, UserSignOutCompleted, BuildCompleted, BuildTriggered } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { MessageAction, EXTENSION_NAME, SIGN_RECOMMEND_HINT_CONFIG_NAME, USER_TYPE, UserType } from '../shared';
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
            case EventType.ExtensionActivated:
                this.handleExtensionActivated();
                break;
            case EventType.TriggerCommandWithUnkownUserType:
                this.handleCommandWithUnkownUserTypeTriggered();
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
                `If you are a Microsoft employee, you are recommended to login to the Docs system by clicking 'Docs Validation' in the status bar and 'Sign-in' in command palette,` +
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

    private handleCommandWithUnkownUserTypeTriggered() {
        this.showInfoMessage(
            `The command you triggered needs user type information. Please choose either Microsoft employee or Public contributor. ` +
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