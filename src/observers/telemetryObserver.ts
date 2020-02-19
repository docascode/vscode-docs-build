import { BaseEvent, UserSignInTriggered, UserSignInCompleted, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutCompleted, BuildTriggered, BuildCompleted, BuildSucceeded, BuildFailed } from '../common/loggingEvents';
import TelemetryReporter from 'vscode-extension-telemetry';
import { EventType } from '../common/eventType';
import { DocsSignInType } from '../shared';
import { DocsError } from '../error/docsError';
import { BuildType } from '../build/buildInput';
import { DocfxExecutionResult } from '../build/buildResult';

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
            case EventType.BuildTriggered:
                this.handleBuildTriggered(<BuildTriggered>event);
                break;
            case EventType.BuildCompleted:
                this.handleBuildCompleted(<BuildCompleted>event);
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
                correlationId: event.correlationId,
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
                result: event.succeeded ? 'Succeeded' : 'Failed',
            }
        );
    }

    // Build
    private handleBuildTriggered(event: BuildTriggered) {
        this.reporter.sendTelemetryEvent(
            'Build.Triggered',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleBuildCompleted(event: BuildCompleted) {
        let result = event.result;
        let errorCode: string;
        let buildType: BuildType;
        let localRepositoryUrl: string;
        let originalRepositoryUrl: string;
        let localRepositoryBranch: string;

        let isRestoreSkipped = false;
        let restoreTimeInSeconds: number;
        let buildTimeInSeconds: number;

        let buildInput = event.buildInput;
        if (buildInput) {
            buildType = buildInput.buildType;
            localRepositoryUrl = buildInput.localRepositoryUrl;
            originalRepositoryUrl = buildInput.originalRepositoryUrl;
            localRepositoryBranch = buildInput.localRepositoryBranch;
        }
        if (event.result === DocfxExecutionResult.Succeeded) {
            let buildResult = (<BuildSucceeded>event).buildResult;
            isRestoreSkipped = buildResult.isRestoreSkipped;
            restoreTimeInSeconds = buildResult.restoreTimeInSeconds;
            buildTimeInSeconds = buildResult.buildTimeInSeconds;
        } else if (event.result === DocfxExecutionResult.Failed) {
            errorCode = this.getErrorCode((<BuildFailed>event).err);
        }
        this.reporter.sendTelemetryEvent(
            'Build.Completed',
            {
                correlationId: event.correlationId,
                result,
                errorCode,
                isRestoreSkipped: isRestoreSkipped.toString(),
                buildType,
                localRepositoryUrl,
                originalRepositoryUrl,
                localRepositoryBranch
            },
            {
                totalTimeInSeconds: event.totalTimeInSeconds,
                restoreTimeInSeconds,
                buildTimeInSeconds
            }
        );
    }

    private getErrorCode(err: Error): string {
        let errorCode = undefined;
        if (err instanceof DocsError) {
            errorCode = err.code;
        }
        return errorCode;
    }
}