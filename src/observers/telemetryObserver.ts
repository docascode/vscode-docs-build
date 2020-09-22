import { BaseEvent, UserSignInTriggered, UserSignInCompleted, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutCompleted, BuildTriggered, BuildCompleted, BuildSucceeded, BuildFailed, LearnMoreClicked, QuickPickTriggered, QuickPickCommandSelected, DependencyInstallStarted, DependencyInstallCompleted, PackageInstallCompleted, PackageInstallAttemptFailed, CancelBuildTriggered, CancelBuildCompleted, DocfxRestoreCompleted } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { DocsRepoType } from '../shared';
import { DocsError } from '../error/docsError';
import { BuildType } from '../build/buildInput';
import { DocfxExecutionResult } from '../build/buildResult';
import TelemetryReporter from '../telemetryReporter';
import { getFolderSizeInMB } from '../utils/utils';
import os from 'os';
import path from 'path';

export class TelemetryObserver {
    constructor(private _reporter: TelemetryReporter) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            // Sign
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
            // Build
            case EventType.BuildTriggered:
                this.handleBuildTriggered(<BuildTriggered>event);
                break;
            case EventType.BuildCompleted:
                this.handleBuildCompleted(<BuildCompleted>event);
                break;
            case EventType.DocfxRestoreCompleted:
                this.handleDocfxRestoreCompleted(<DocfxRestoreCompleted>event);
                break;
            case EventType.CancelBuildTriggered:
                this.handleCancelBuildTriggered(<CancelBuildTriggered>event);
                break;
            case EventType.CancelBuildCompleted:
                this.handleCancelBuildCompleted(<CancelBuildCompleted>event);
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
            case EventType.PackageInstallAttemptFailed:
                this.handlePackageInstallAttemptFailed(<PackageInstallAttemptFailed>event);
                break;
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
        this._reporter.sendTelemetryEvent(
            'SignIn.Triggered',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleUserSignInCompleted(event: UserSignInCompleted) {
        // Send telemetry
        let signInType: DocsRepoType;
        let errorCode: string;
        if (event.succeeded) {
            let userInfo = (<UserSignInSucceeded>event).credential.userInfo;
            signInType = userInfo.signType;
        } else {
            errorCode = this.getErrorCode((<UserSignInFailed>event).err);
        }
        this._reporter.sendTelemetryEvent(
            'SignIn.Completed',
            {
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed',
                RetrievedFromCache: event.retrievedFromCache.toString(),
                SignInType: signInType,
                ErrorCode: errorCode
            }
        );
    }

    private handleUserSignOutTriggered(event: UserSignOutTriggered) {
        this._reporter.sendTelemetryEvent(
            'SignOut.Triggered',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleUserSignOutCompleted(event: UserSignOutCompleted) {
        this._reporter.sendTelemetryEvent(
            'SignOut.Completed',
            {
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed',
            }
        );
    }

    // Build
    private handleBuildTriggered(event: BuildTriggered) {
        this._reporter.sendTelemetryEvent(
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
        this._reporter.sendTelemetryEvent(
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

    private handleDocfxRestoreCompleted(event: DocfxRestoreCompleted) {
        getFolderSizeInMB(path.join(os.homedir(), '.docfx')).then(cacheSize =>
            this._reporter.sendTelemetryEvent(
                'BuildCacheSize',
                {
                    CorrelationId: event.correlationId,
                },
                {
                    SizeInMB: cacheSize,
                }
            ));
    }

    private handleCancelBuildTriggered(event: CancelBuildTriggered) {
        this._reporter.sendTelemetryEvent(
            'CancelBuild.Triggered',
            {
                CorrelationId: event.correlationId,
            }
        );
    }

    private handleCancelBuildCompleted(event: CancelBuildCompleted) {
        this._reporter.sendTelemetryEvent(
            'CancelBuild.Completed',
            {
                CorrelationId: event.correlationId,
                Result: event.succeeded ? 'Succeeded' : 'Failed'
            }
        );
    }

    // Install Dependencies
    private handleDependencyInstallStarted(event: DependencyInstallStarted) {
        this._reporter.sendTelemetryEvent(
            'InstallDependency.Started',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleDependencyInstallCompleted(event: DependencyInstallCompleted) {
        this._reporter.sendTelemetryEvent(
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
        this._reporter.sendTelemetryEvent(
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

    private handlePackageInstallAttemptFailed(event: PackageInstallAttemptFailed) {
        this._reporter.sendTelemetryMetric(
            'InstallDependency.Package.Error',
            1,
            {
                CorrelationId: event.correlationId,
                PackageId: event.installedPackage.id,
                ErrorCode: this.getErrorCode(event.err)
            }
        );
    }

    private handleQuickPickTriggered(event: QuickPickTriggered) {
        this._reporter.sendTelemetryEvent(
            'QuickPick.Triggered',
            {
                CorrelationId: event.correlationId
            }
        );
    }

    private handleQuickPickCommandSelected(event: QuickPickCommandSelected) {
        this._reporter.sendTelemetryEvent(
            'QuickPick.CommandSelected',
            {
                CorrelationId: event.correlationId,
                Command: event.command
            }
        );
    }

    private handleLearnMoreClicked(event: LearnMoreClicked) {
        this._reporter.sendTelemetryEvent(
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