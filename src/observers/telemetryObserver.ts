import { BaseEvent, UserSignInTriggered, UserSignInCompleted, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutCompleted, BuildTriggered, BuildCompleted, BuildSucceeded, BuildFailed, BuildCacheSizeCalculated, LearnMoreClicked, QuickPickTriggered, QuickPickCommandSelected, DependencyInstallStarted, DependencyInstallCompleted, PackageInstallCompleted } from '../common/loggingEvents';
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

    private handleBuildCacheSize(event: BuildCacheSizeCalculated) {
        this.reporter.sendTelemetryEvent(
            'BuildCacheSize',
            {
                correlationId: event.correlationId,
                sizeInMB: event.sizeInMB.toString(),
            }
        );
    }

    // Install Dependencies
    private handleDependencyInstallStarted(event: DependencyInstallStarted) {
        this.reporter.sendTelemetryEvent(
            'InstallDependency.Started',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleDependencyInstallCompleted(event: DependencyInstallCompleted) {
        this.reporter.sendTelemetryEvent(
            'InstallDependency.Completed',
            {
                correlationId: event.correlationId,
                result: event.succeeded ? 'Succeeded' : 'Failed'
            },
            {
                elapsedTimeInSeconds: event.elapsedTimeInSeconds
            }
        );
    }

    private handlePackageInstallCompleted(event: PackageInstallCompleted) {
        this.reporter.sendTelemetryEvent(
            'InstallDependency.Package.Completed',
            {
                correlationId: event.correlationId,
                result: event.succeeded ? 'Succeeded' : 'Failed',
                packageId: event.installedPackage.id,
            },
            {
                retryCount: event.retryCount,
                elapsedTimeInSeconds: event.elapsedTimeInSeconds
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

    private handleLearnMoreClicked(event: LearnMoreClicked) {
        let errorCode = event.diagnosticErrorCode;
        this.reporter.sendTelemetryEvent(
            'LearnMore.Clicked',
            {
                correlationId: event.correlationId,
                errorCode
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