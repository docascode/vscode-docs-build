export interface BuildResult {
    result: DocfxExecutionResult;
    isRestoreSkipped: boolean;
    restoreTimeInSeconds?: number;
    buildTimeInSeconds?: number;
}

export type DocfxExecutionResult = 'Succeeded' | 'Failed' | 'Canceled';