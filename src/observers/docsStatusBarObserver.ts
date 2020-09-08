import { BaseStatusBarObserver } from './baseStatusBarObserver';
import { BaseEvent, UserSignInSucceeded, UserSignInCompleted } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { Credential } from '../credential/credentialController';
import { StatusBarItem } from 'vscode';
import { EnvironmentController } from '../common/environmentController';

export class DocsStatusBarObserver extends BaseStatusBarObserver {
    constructor(statusBarItem: StatusBarItem, private _environmentController: EnvironmentController) {
        super(statusBarItem);
    }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.CredentialInitializing:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix}: Initializing`, undefined);
                break;
            case EventType.UserSignInTriggered:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix}: Signing in`, 'docs.signOut');
                break;
            case EventType.UserSignInCompleted:
                if ((<UserSignInCompleted>event).succeeded) {
                    let asUserSignInSucceeded = <UserSignInSucceeded> event;
                    this.handleSignedIn(asUserSignInSucceeded.credential);
                }
                break;
            case EventType.CredentialReset:
                this.setAndShowStatusBar(`${this.statusBarTextPrefix}`, 'docs.validationQuickPick');
                break;
        }
    }

    private get statusBarTextPrefix() {
        return this._environmentController.env === 'PPE' ? 'Docs Validation(PPE)' : 'Docs Validation';
    }

    private handleSignedIn(credential: Credential) {
        let icon = credential.userInfo!.signType === 'GitHub' ? '$(mark-github)' : '$(rocket)';
        this.setAndShowStatusBar(`${this.statusBarTextPrefix}: ${icon} ${credential.userInfo!.userName}`, 'docs.validationQuickPick');
    }
}