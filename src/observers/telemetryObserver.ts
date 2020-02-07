import { BaseEvent, UserSignInFailed, UserSignInTriggered, UserSignOutTriggered, UserSignOutCompleted, SignResult, UserSignInCompleted, UserSignInSucceeded } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import TelemetryReporter from 'vscode-extension-telemetry';
import { ErrorCode } from '../Errors/ErrorCode';
import { DocsError } from '../Errors/DocsError';
import { DocsSignInType } from '../shared';

export class TelemetryObserver {
    constructor(private reporter: TelemetryReporter) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignInTriggered:
                this.handleUserSignInTriggered(<UserSignInTriggered>event);
                break;
            case EventType.UserSignInCompleted:
                this.handleUserSignInCompleted(<UserSignInCompleted>event);
                break;
            case EventType.UserSignOutTriggered:
                this.handleUserSignOutTriggered(<UserSignOutTriggered>event);
                break;
            case EventType.UserSignOutCompleted:
                this.handleUserSignOutCompleted(<UserSignOutCompleted>event);
                break;
        }
    }

    // Sign
    private handleUserSignInTriggered(event: UserSignInTriggered) {
        this.reporter.sendTelemetryEvent(
            'SignIn.Triggered',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleUserSignInCompleted(event: UserSignInCompleted) {
        let correlationId = event.correlationId;
        let result = SignResult[event.result];
        let signInType: DocsSignInType;
        let userName: string;
        let userEmail: string;
        let errorCode: string;
        if (event.result === SignResult.Succeeded) {
            let userInfo = (<UserSignInSucceeded>event).credential.userInfo;
            signInType = userInfo.signType;
            userName = userInfo.userName;
            userEmail = userInfo.userEmail;
        } else if (event.result === SignResult.Failed) {
            errorCode = this.getErrorCode((<UserSignInFailed>event).err);
        }
        this.reporter.sendTelemetryEvent(
            'SignIn.Completed',
            {
                correlationId,
                result,
                signInType,
                userName,
                userEmail,
                errorCode
            }
        );
    }

    private handleUserSignOutTriggered(event: UserSignOutTriggered) {
        this.reporter.sendTelemetryEvent(
            'SignOut.Triggered',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleUserSignOutCompleted(event: UserSignOutCompleted) {
        this.reporter.sendTelemetryEvent(
            'SignOut.Completed',
            {
                correlationId: event.correlationId,
                result: SignResult[event.result],
            }
        );
    }

    private getErrorCode(err: Error): string {
        let errorCode = undefined;
        if (err instanceof DocsError) {
            errorCode = ErrorCode[err.code];
        }
        return errorCode;
    }
}