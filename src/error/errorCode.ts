export enum ErrorCode {
    // Sign
    GitHubSignInTimeOut = 'GitHubSignInTimeOut',
    GitHubSignInExternalUrlDeclined = 'GitHubSignInExternalUrlDeclined',
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

    // Install Dependency
    CreateInstallLockFileFailed = 'CreateInstallLockFileFailed',
    DownloadFileFailed = 'DownloadFileFailed',
    CheckIntegrityFailed = 'CheckIntegrityFailed',
    InstallZipFileFailed = 'InstallZipFileFailed',
}