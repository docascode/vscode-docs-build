import fs from 'fs-extra';
import vscode from 'vscode';
import { EventType } from '../common/eventType';
import { BaseEvent, UserSignInFailed, RepositoryEnabledV3, UserSignInCompleted, UserSignOutCompleted, UserSignOutFailed, BuildCompleted, BuildFailed } from '../common/loggingEvents';
import { MessageAction } from '../shared';
import { safelyReadJsonFile } from '../utils/utils';
import { ErrorCode } from '../error/errorCode';
import { DocsError } from '../error/docsError';
import { DocfxExecutionResult } from '../build/buildResult';

export class ErrorMessageObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInCompleted:
                if (!(<UserSignInCompleted>event).succeeded) {
                    let asUserSignInFailed = <UserSignInFailed>event;
                    this.showErrorMessage(`Sign-In failed: ${asUserSignInFailed.err.message}`);
                }
                break;
            case EventType.UserSignOutCompleted:
                if (!(<UserSignOutCompleted>event).succeeded) {
                    let asUserSignOutFailed = <UserSignOutFailed>event;
                    this.showErrorMessage(`Sign-Out failed: ${asUserSignOutFailed.err.message}`);
                }
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === DocfxExecutionResult.Failed) {
                    this.handleBuildFailed(<BuildFailed>event);
                }
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

    private handleBuildFailed(event: BuildFailed) {
        let action: MessageAction;
        let error = <DocsError>event.err;
        switch (error.code) {
            case ErrorCode.TriggerBuildOnV2Repo:
                action = new MessageAction(
                    'Enable DocFX v3',
                    undefined,
                    'Would you like to enable DocFX v3 on this repository?',
                    (args: any[]) => {
                        let [opConfigPath, eventStream] = args;
                        let opConfig = safelyReadJsonFile(opConfigPath);
                        opConfig.docs_build_engine = { name: 'docfx_v3' };
                        vscode.window.showTextDocument(vscode.Uri.file(opConfigPath));
                        fs.writeJSONSync(opConfigPath, opConfig, { spaces: 2 });
                        eventStream.post(new RepositoryEnabledV3());
                    },
                    error.extensionData);
                break;
            case ErrorCode.TriggerBuildBeforeSignedIn:
                action = new MessageAction('Sign-in', 'docs.signIn');
                break;
        }
        this.showErrorMessage(`Build current workspace failed(${event.err.message}), please check the channel output for detail`, action);
    }

    private handleCredentialExpired() {
        let message = `Credential has expired. Please sign-in again to continue.`;
        let messageAction = new MessageAction('Sign-in', 'docs.signIn');
        this.showErrorMessage(message, messageAction);
    }
}
