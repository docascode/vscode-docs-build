export enum ErrorCode {
    // Build
    TriggerBuildWhenInstantNotAvailable,
    TriggerBuildBeforeSignedIn,
    TriggerBuildOnV2Repo,
    TriggerBuildOnNonWorkspace,
    TriggerBuildOnNonDocsRepo,
    TriggerBuildOnInvalidDocsRepo,
    TriggerBuildWithoutSpecificWorkspace,
    RunDocfxFailed,
    GenerateReportFailed,
}