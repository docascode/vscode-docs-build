export enum ErrorCode {
    // Sign
    AADSignInTimeOut = 'AADSignInTimeOut',
    GitHubSignInTimeOut = 'GitHubSignInTimeOut',
    AADSignInExternalUrlDeclined = 'AADSignInExternalUrlDeclined',
    GitHubSignInExternalUrlDeclined = 'GitHubSignInExternalUrlDeclined',
    AADSignInFailed = 'AADSignInFailed',
    GitHubSignInFailed = 'GitHubSignInFailed',

    // Build
    TriggerBuildWhenInstantNotAvailable = 'TriggerBuildWhenInstantNotAvailable',
    TriggerBuildBeforeSignedIn = 'TriggerBuildBeforeSignedIn',
    TriggerBuildOnV2Repo = 'TriggerBuildOnV2Repo',
    TriggerBuildOnNonWorkspace = 'TriggerBuildOnNonWorkspace',
    TriggerBuildOnNonDocsRepo = 'TriggerBuildOnNonDocsRepo',
    TriggerBuildOnInvalidDocsRepo = 'TriggerBuildOnInvalidDocsRepo',
    TriggerBuildWithoutSpecificWorkspace = 'TriggerBuildWithoutSpecificWorkspace',
    RunDocfxFailed = 'RunDocfxFailed',
    GenerateReportFailed = 'GenerateReportFailed',
}