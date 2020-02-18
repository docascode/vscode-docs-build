export enum ErrorCode {
    // Sign
    AADSignInTimeOut,
    GitHubSignInTimeOut,
    AADSignInExternalUrlDeclined,
    GitHubSignInExternalUrlDeclined,
    AADSignInFailed,
    GitHubSignInFailed,

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