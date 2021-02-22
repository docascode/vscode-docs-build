export enum ErrorCode {
    // Sign in and out GitHub
    GitHubSignInTimeOut = 'GitHubSignInTimeOut',
    GitHubSignInExternalUrlDeclined = 'GitHubSignInExternalUrlDeclined',
    GitHubSignInFailed = 'GitHubSignInFailed',

    // Sign in and out Azure DevOps
    AzureDevOpsSignInTimeOut = 'AzureDevOpsSignInTimeOut',
    AzureDevOpsSignInExternalUrlDeclined = 'AzureDevOpsSignInExternalUrlDeclined',
    AzureDevOpsSignInFailed = 'AzureDevOpsSignInFailed',

    // Build
    TriggerBuildWhenInstantNotAvailable = 'TriggerBuildWhenInstantNotAvailable',
    TriggerBuildWithCredentialExpired = 'TriggerBuildWithCredentialExpired',
    TriggerBuildOnInvalidDocsRepo = 'TriggerBuildOnInvalidDocsRepo',
    RunDocfxFailed = 'RunDocfxFailed',
    GenerateReportFailed = 'GenerateReportFailed',
    TriggerBuildBeforeSignIn = 'TriggerBuildBeforeSignIn',

    // Install Dependency
    CreateInstallLockFileFailed = 'CreateInstallLockFileFailed',
    DownloadFileFailed = 'DownloadFileFailed',
    CheckIntegrityFailed = 'CheckIntegrityFailed',
    InstallZipFileFailed = 'InstallZipFileFailed',
}