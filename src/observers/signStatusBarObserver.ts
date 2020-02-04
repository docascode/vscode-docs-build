import { BaseStatusBarObserver } from './baseStatusBarObserver';
import { BaseEvent, UserSignInSucceeded, CredentialRetrieveFromLocalCredentialManager } from '../common/loggingEvents';
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
                this.setAndShowStatusBar(`${this.statusBarTextPrefix} Initializing`, undefined);
                break;
            case EventType.UserSigningIn:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix} Signing-in`, undefined);
                break;
            case EventType.UserSignInSucceeded:
                let asUserSignIn = <UserSignInSucceeded>event;
                this.handleSignedIn(asUserSignIn.credential);
                break;
            case EventType.CredentialRetrieveFromLocalCredentialManager:
                let asCredentialRetrieveFromLocalCredentialManager = <CredentialRetrieveFromLocalCredentialManager>event;
                this.handleSignedIn(asCredentialRetrieveFromLocalCredentialManager.credential);
                break;
            case EventType.UserSignedOut:
            case EventType.CredentialReset:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix} Sign-in to Docs`, 'docs.signIn');
                break;
        }
    }

    private get statusBarTextPrefix() {
        return this.environmentController.env === 'PPE' ? 'Docs(Sandbox):' : 'Docs:';
    }

    private handleSignedIn(credential: Credential) {
        let icon = credential.userInfo!.signType === 'GitHub' ? '$(mark-github)' : '$(rocket)';
        this.setAndShowStatusBar(`${this.statusBarTextPrefix} ${icon} ${credential.userInfo!.userName}(${credential.userInfo!.userEmail})`, 'docs.validationQuickPick');
    }
}