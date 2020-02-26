import { BaseEvent, UserSignInTriggered, UserSignInCompleted, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutCompleted, BuildTriggered, BuildCompleted, BuildSucceeded, BuildFailed, BuildCacheSizeCalculated, LearnMoreClicked, QuickPickTriggered, QuickPickCommandSelected, DependencyInstallStarted, DependencyInstallCompleted, PackageInstallCompleted, CredentialRetrievedFromLocalCredentialManager } from '../common/loggingEvents';
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
            case EventType.CredentialRetrievedFromLocalCredentialManager:
                this.handleCredentialRetrievedFromLocalCredentialManager(<CredentialRetrievedFromLocalCredentialManager>event);
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
                break;
            case EventType.BuildCacheSizeCalculated:
                this.handleBuildCacheSize(<BuildCacheSizeCalculated>event);
                break;
            case EventType.DependencyInstallStarted:
                this.handleDependencyInstallStarted(<DependencyInstallStarted>event);
                break;
            case EventType.DependencyInstallCompleted:
                this.handleDependencyInstallCompleted(<DependencyInstallCompleted>event);
                break;
            case EventType.PackageInstallCompleted:
                this.handlePackageInstallCompleted(<PackageInstallCompleted>event);
                break;
            // TODO: Send Metric for event PackageInstallAttemptFailed
            // Depends on this PR: https://github.com/microsoft/vscode-extension-telemetry/pull/42
            case EventType.QuickPickTriggered:
                this.handleQuickPickTriggered(<QuickPickTriggered>event);
                break;
            case EventType.QuickPickCommandSelected:
                this.handleQuickPickCommandSelected(<QuickPickCommandSelected>event);
                break;
            case EventType.LearnMoreClicked:
                this.handleLearnMoreClicked(<LearnMoreClicked>event);
                break;
        }
    }

    // Sign
    private handleUserSignInTriggered(event: UserSignInTriggered) {
        this.reporter.sendTelemetryEvent(
            'SignIn.Triggered',

            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleUserSignInCompleted(event: UserSignInCompleted) {
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
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed',
                RetrievedFromCache: false.toString(),
                SignInType: signInType,
                UserName: userName,
                UserEmail: userEmail,
                ErrorCode: errorCode
            }
        );
    }

    private handleCredentialRetrievedFromLocalCredentialManager(event: CredentialRetrievedFromLocalCredentialManager) {
        let userInfo = event.credential.userInfo;
        this.reporter.sendTelemetryEvent(
            'SignIn.Completed',
            {
                CorrelationId: event.correlationId,
                Result: 'Succeeded',
                RetrievedFromCache: true.toString(),
                SignInType: userInfo.signType,
                UserName: userInfo.userName,
                UserEmail: userInfo.userEmail
            }
        );
    }

    private handleUserSignOutTriggered(event: UserSignOutTriggered) {
        this.reporter.sendTelemetryEvent(
            'SignOut.Triggered',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleUserSignOutCompleted(event: UserSignOutCompleted) {
        this.reporter.sendTelemetryEvent(
            'SignOut.Completed',
            {
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed',
            }
        );
    }

    // Build
    private handleBuildTriggered(event: BuildTriggered) {
        this.reporter.sendTelemetryEvent(
            'Build.Triggered',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleBuildCompleted(event: BuildCompleted) {
        let errorCode: string;
        let buildType: BuildType;
        let localRepositoryUrl: string;
        let originalRepositoryUrl: string;

        let isRestoreSkipped = false;
        let restoreTimeInSeconds: number;
        let buildTimeInSeconds: number;

        let buildInput = event.buildInput;
        if (buildInput) {
            buildType = buildInput.buildType;
            localRepositoryUrl = buildInput.localRepositoryUrl;
            originalRepositoryUrl = buildInput.originalRepositoryUrl;
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
                CorrelationId: event.correlationId,
                Result: event.result,
                ErrorCode: errorCode,
                IsRestoreSkipped: isRestoreSkipped.toString(),
                BuildType: buildType,
                LocalRepositoryUrl: localRepositoryUrl,
                OriginalRepositoryUrl: originalRepositoryUrl,
            },
            {
                TotalTimeInSeconds: event.totalTimeInSeconds,
                RestoreTimeInSeconds: restoreTimeInSeconds,
                BuildTimeInSeconds: buildTimeInSeconds
            }
        );
    }

    private handleBuildCacheSize(event: BuildCacheSizeCalculated) {
        this.reporter.sendTelemetryEvent(
            'BuildCacheSize',
            {
                CorrelationId: event.correlationId,
            },
            {
                SizeInMB: event.sizeInMB,
            }
        );
    }

    // Install Dependencies
    private handleDependencyInstallStarted(event: DependencyInstallStarted) {
        this.reporter.sendTelemetryEvent(
            'InstallDependency.Started',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleDependencyInstallCompleted(event: DependencyInstallCompleted) {
        this.reporter.sendTelemetryEvent(
            'InstallDependency.Completed',
            {
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed'
            },
            {
                ElapsedTimeInSeconds: event.elapsedTimeInSeconds
            }
        );
    }

    private handlePackageInstallCompleted(event: PackageInstallCompleted) {
        this.reporter.sendTelemetryEvent(
            'InstallDependency.Package.Completed',
            {
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed',
                PackageId: event.installedPackage.id,
            },
            {
                RetryCount: event.retryCount,
                ElapsedTimeInSeconds: event.elapsedTimeInSeconds
            }
        );
    }

    private handleQuickPickTriggered(event: QuickPickTriggered) {
        this.reporter.sendTelemetryEvent(
            'QuickPick.Triggered',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleQuickPickCommandSelected(event: QuickPickCommandSelected) {
        this.reporter.sendTelemetryEvent(
            'QuickPick.CommandSelected',
            {
                CorrelationId: event.correlationId,
                Command: event.command
            }
        );
    }

    private handleLearnMoreClicked(event: LearnMoreClicked) {
        this.reporter.sendTelemetryEvent(
            'LearnMore.Clicked',
            {
                CorrelationId: event.correlationId,
                ErrorCode: event.diagnosticErrorCode
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