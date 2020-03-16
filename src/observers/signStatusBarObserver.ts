import { BaseStatusBarObserver } from './baseStatusBarObserver';
import { BaseEvent, UserSignInSucceeded, UserSignInCompleted } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { Credential } from '../credential/credentialController';
import { StatusBarItem } from 'vscode';
import { EnvironmentController } from '../common/environmentController';

export class SignStatusBarObserver extends BaseStatusBarObserver {
    constructor(statusBarItem: StatusBarItem, private environmentController: EnvironmentController) {
        super(statusBarItem);
    }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.CredentialInitializing:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix} initializing`, undefined);
                break;
            case EventType.UserSignInTriggered:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix} Signing in`, undefined);
                break;
            case EventType.UserSignInCompleted:
                if ((<UserSignInCompleted>event).succeeded) {
                    let asUserSignInSucceeded = <UserSignInSucceeded> event;
                    this.handleSignedIn(asUserSignInSucceeded.credential);
                }
                break;
            case EventType.CredentialReset:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix} Sign in to Docs Build`, 'docs.signIn');
                break;
        }
    }

    private get statusBarTextPrefix() {
        return this.environmentController.env === 'PPE' ? 'Docs (PPE):' : 'Docs:';
    }

    private handleSignedIn(credential: Credential) {
        let icon = credential.userInfo!.signType === 'GitHub' ? '$(mark-github)' : '$(rocket)';
        this.setAndShowStatusBar(`${this.statusBarTextPrefix} ${icon} ${credential.userInfo!.userName}(${credential.userInfo!.userEmail})`, 'docs.validationQuickPick');
    }
}