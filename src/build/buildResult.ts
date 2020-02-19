export interface BuildResult {
    result: DocfxExecutionResult;
    isRestoreSkipped: boolean;
    restoreTimeInSeconds?: number;
    buildTimeInSeconds?: number;
}

export enum DocfxExecutionResult {
    Succeeded = 'Succeeded',
    Failed = 'Failed',
    Canceled = 'Canceled'
}