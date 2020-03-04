export enum ErrorCode {
    // Sign GitHub
    GitHubSignInTimeOut = 'GitHubSignInTimeOut',
    GitHubSignInExternalUrlDeclined = 'GitHubSignInExternalUrlDeclined',
    GitHubSignInFailed = 'GitHubSignInFailed',

    // Sign Azure-DevOps
    AzureDevOpsSignInTimeOut = 'AzureDevOpsSignInTimeOut',
    AzureDevOpsSignInExternalUrlDeclined = 'AzureDevOpsSignInExternalUrlDeclined',
    AzureDevOpsSignInFailed = 'AzureDevOpsSignInFailed',

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