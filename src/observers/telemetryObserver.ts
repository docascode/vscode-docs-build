import { BaseEvent, UserSignInTriggered, UserSignInCompleted, UserSignInSucceeded, UserSignInFailed, QuickPickTriggered, QuickPickCommandSelected } from '../common/loggingEvents';
import TelemetryReporter from 'vscode-extension-telemetry';
import { EventType } from '../common/eventType';
import { DocsSignInType } from '../shared';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';

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
            case EventType.QuickPickTriggered:
                this.handleQuickPickTriggered(<QuickPickTriggered>event);
                break;
            case EventType.QuickPickCommandSelected:
                this.handleQuickPickCommandSelected(<QuickPickCommandSelected>event);
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
        let result = event.succeeded ? 'Succeeded' : 'Failed';
        let signInType: DocsSignInType;
        let userName: string;
        let userEmail: string;
        let errorCode: string;
        if (event.succeeded) {
            let userInfo = (<UserSignInSucceeded>event).credential.userInfo;
            signInType = userInfo.signType;
            userName = userInfo.userName;
            userEmail = userInfo.userEmail;
        } else {
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

    private handleQuickPickTriggered(event: QuickPickTriggered) {
        this.reporter.sendTelemetryEvent(
            'QuickPick.Triggered',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleQuickPickCommandSelected(event: QuickPickCommandSelected) {
        this.reporter.sendTelemetryEvent(
            'QuickPick.CommandSelected',
            {
                correlationId: event.correlationId,
                command: event.command
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