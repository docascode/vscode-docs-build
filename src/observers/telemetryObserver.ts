import { BaseEvent, BuildTriggered, BuildCompleted, BuildSucceeded, BuildFailed } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import TelemetryReporter from 'vscode-extension-telemetry';
import { ErrorCode } from '../errors/ErrorCode';
import { DocsError } from '../errors/DocsError';
import { BuildType } from '../build/buildInput';

export class TelemetryObserver {
    constructor(private reporter: TelemetryReporter) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.BuildTriggered:
                this.handleBuildTriggered(<BuildTriggered>event);
                break;
            case EventType.BuildCompleted:
                this.handleBuildCompleted(<BuildCompleted>event);
        }
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
        let correlationId = event.correlationId;
        let result = event.result;
        let totalTimeInSeconds = event.totalTimeInSeconds;
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
        if (event.result === 'Succeeded') {
            let buildResult = (<BuildSucceeded>event).buildResult;
            isRestoreSkipped = buildResult.isRestoreSkipped;
            restoreTimeInSeconds = buildResult.restoreTimeInSeconds;
            buildTimeInSeconds = buildResult.buildTimeInSeconds;
        } else if (event.result === 'Failed') {
            errorCode = this.getErrorCode((<BuildFailed>event).err);
        }
        this.reporter.sendTelemetryEvent(
            'Build.Completed',
            {
                correlationId,
                result,
                errorCode,
                isRestoreSkipped: isRestoreSkipped.toString(),
                buildType,
                localRepositoryUrl,
                originalRepositoryUrl,
                localRepositoryBranch
            },
            {
                totalTimeInSeconds,
                restoreTimeInSeconds,
                buildTimeInSeconds
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