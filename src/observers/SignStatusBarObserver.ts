import { BaseStatusBarItemObserver } from "./BaseStatusBarObserver";
import { BaseEvent, UserSignedIn, FetchFromLocalCredentialManager } from "../common/loggingEvents";
import { EventType } from "../common/EventType";
import { environmentController } from "../common/shared";
import { Credential } from "../credential/CredentialController";

export class SignStatusBarObserver extends BaseStatusBarItemObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.CredentialInitializing:
                this.SetAndShowStatusBar(`${this.statusBarTextPrefix} Initializing`, undefined);
                break;
            case EventType.UserSigningIn:
                this.SetAndShowStatusBar(`${this.statusBarTextPrefix} Signing In`, undefined);
                break;
            case EventType.UserSignedIn:
                let asUserSignIn = <UserSignedIn>event;
                this.handleSignedIn(asUserSignIn.credential);
                break;
            case EventType.FetchFromLocalCredentialManager:
                let asFetchFromLocalCredentialManager = <FetchFromLocalCredentialManager>event;
                this.handleSignedIn(asFetchFromLocalCredentialManager.credential);
                break;
            case EventType.UserSignedOut:
            case EventType.ResetUserInfo:
                this.SetAndShowStatusBar(`${this.statusBarTextPrefix} Sign in to Docs`, 'docs.signIn');
                break;
        }
    }

    private get statusBarTextPrefix() {
        return environmentController.env === 'PPE' ? 'Docs(Sandbox):' : 'Docs:';
    }

    private handleSignedIn(credential: Credential) {
        let icon = credential.userInfo!.signType === 'Github' ? '$(mark-github)' : '$(rocket)';
        this.SetAndShowStatusBar(`${this.statusBarTextPrefix} ${icon} ${credential.userInfo!.userName}(${credential.userInfo!.userEmail})`, undefined);
    }
}