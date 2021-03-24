import vscode from 'vscode';

import { DocfxExecutionResult } from '../build/buildResult';
import { EventType } from '../common/eventType';
import { BaseEvent, BuildCompleted, BuildFailed, CredentialExpired, CredentialRefreshFailed, StartLanguageServerCompleted, UserSignInCompleted, UserSignInFailed, UserSignOutCompleted, UserSignOutFailed } from '../common/loggingEvents';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { EXTENSION_NAME, MessageAction, USER_TYPE, UserType } from '../shared';

export class ErrorMessageObserver {
    public eventHandler = (event: BaseEvent): void => {
        switch (event.type) {
            case EventType.UserSignInCompleted:
                if (!(<UserSignInCompleted>event).succeeded) {
                    const asUserSignInFailed = <UserSignInFailed>event;
                    this.showErrorMessage(`Signing in failed: ${asUserSignInFailed.err.message}`);
                }
                break;
            case EventType.UserSignOutCompleted:
                if (!(<UserSignOutCompleted>event).succeeded) {
                    const asUserSignOutFailed = <UserSignOutFailed>event;
                    this.showErrorMessage(`Signing out failed: ${asUserSignOutFailed.err.message}`);
                }
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === DocfxExecutionResult.Failed) {
                    this.handleBuildFailed(<BuildFailed>event);
                }
                break;
            case EventType.PublicContributorSignIn:
                this.handlePublicContributorSignIn();
                break;
            case EventType.TriggerCommandWithUnknownUserType:
                this.handleCommandWithUnknownUserTypeTriggered();
                break;
            case EventType.StartLanguageServerCompleted:
                if (!(<StartLanguageServerCompleted>event).succeeded) {
                    this.handleStartServerFailed(<StartLanguageServerCompleted>event);
                }
                break;
            case EventType.CredentialExpired:
                if ((<CredentialExpired>event).duringLanguageServerRunning) {
                    this.handleCredentialExpiredWhenLanguageServerRunning();
                }
                break;
            case EventType.CredentialRefreshFailed:
                this.handleCredentialRefreshFailed(<CredentialRefreshFailed>event);
                break;
        }
    }

    private async showErrorMessage(message: string, ...actions: MessageAction[]) {
        let errorMsg = `[Docs Validation] ${message}`;
        actions.forEach((action) => {
            if (action && action.description) {
                errorMsg += ` ${action.description}`;
            }
        });
        const input = <MessageAction>(await vscode.window.showErrorMessage(errorMsg, ...actions));
        if (input) {
            if (input.command) {
                vscode.commands.executeCommand(input.command, undefined);
            } else if (input.callback) {
                input.callback(input.args);
            }
        }
    }

    private handleBuildFailed(event: BuildFailed) {
        const errorMessage = `Repository validation failed. `;
        const error: Error = event.err;
        this.setAndShowErrorMessage(error, errorMessage);
    }

    private handleStartServerFailed(event: StartLanguageServerCompleted) {
        const errorMessage = `Enable real-time validation failed. `;
        const error: Error = event.err;
        this.setAndShowErrorMessage(error, errorMessage);
    }

    private setAndShowErrorMessage(error: Error, errorMessage: string) {
        let action: MessageAction;
        if (error) {
            switch ((<DocsError>error).code) {
                case ErrorCode.TriggerBuildWithCredentialExpired:
                case ErrorCode.TriggerBuildBeforeSignIn:
                    action = new MessageAction('Sign in', 'docs.signIn');
                    break;
            }
            errorMessage += error.message;
        }
        errorMessage += ' Please check the channel output for details';
        this.showErrorMessage(errorMessage, action);
    }

    private handlePublicContributorSignIn() {
        this.showErrorMessage(`Sign in is only available for Microsoft employees.`);
    }

    private handleCommandWithUnknownUserTypeTriggered() {
        this.showErrorMessage(
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

    private handleCredentialExpiredWhenLanguageServerRunning() {
        const action = new MessageAction('Sign in', 'docs.signIn');
        const message = 'Credential Expired, please sign in again.';
        this.showErrorMessage(message, action);
    }

    private handleCredentialRefreshFailed(event: CredentialRefreshFailed) {
        this.showErrorMessage(event.error.message);
    }
}
