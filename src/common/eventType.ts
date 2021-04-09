export enum EventType {
    // Sign
    CredentialExpired = 'CredentialExpired',
    CredentialInitializing = 'CredentialInitializing',
    CredentialReset = 'CredentialReset',
    UserSignInTriggered = 'UserSignInTriggered',
    UserSignInProgress = 'UserSignInProgress',
    UserSignInCompleted = 'UserSignInCompleted',
    UserSignOutTriggered = 'UserSignOutTriggered',
    UserSignOutCompleted = 'UserSignOutCompleted',
    PublicContributorSignIn = 'PublicContributorSignIn',
    CredentialRefreshFailed = 'CredentialRefreshFailed',

    // Build
    LSPMaxRetryHit = 'LSPMaxRetryHit',
    RepositoryInfoRetrieved = 'RepositoryInfoRetrieved',

    BuildInstantReleased = 'BuildInstantReleased',
    BuildInstantAllocated = 'BuildInstantAllocated',

    BuildTriggered = 'BuildTriggered',
    BuildStarted = 'BuildStarted',
    BuildProgress = 'BuildProgress',
    BuildCompleted = 'BuildCompleted',

    CancelBuildTriggered = 'CancelBuildTriggered',
    CancelBuildCompleted = 'CancelBuildCompleted',

    DocfxRestoreStarted = 'DocfxRestoreStarted',
    DocfxRestoreCompleted = 'DocfxRestoreCompleted',
    DocfxBuildStarted = 'DocfxBuildStarted',
    DocfxBuildCompleted = 'DocfxBuildCompleted',

    // API
    APICallStarted = 'APICallStarted',
    APICallFailed = 'APICallFailed',

    // Runtime dependency
    DependencyInstallStarted = 'DependencyInstallStarted',
    DependencyInstallCompleted = 'DependencyInstallCompleted',
    PackageInstallStarted = 'PackageInstallStarted',
    PackageInstallCompleted = 'PackageInstallCompleted',
    PackageInstallAttemptFailed = 'PackageInstallAttemptFailed',
    DownloadStarted = 'DownloadStarted',
    DownloadProgress = 'DownloadProgress',
    DownloadSizeObtained = 'DownloadSizeObtained',
    DownloadValidating = 'DownloadValidating',
    ZipFileInstalling = 'ZipFileInstalling',
    PlatformInfoRetrieved = 'PlatformInfoRetrieved',

    // Others
    EnvironmentChanged = 'EnvironmentChanged',
    QuickPickTriggered = 'QuickPickTriggered',
    QuickPickCommandSelected = 'QuickPickCommandSelected',
    LearnMoreClicked = 'LearnMoreClicked',
    TriggerCommandWithUnknownUserType = 'TriggerCommandWithUnknownUserType',
    ExtensionActivated = 'ExtensionActivated',

    // Language Server
    StartLanguageServerCompleted = 'StartLanguageServerCompleted',

    // Test only
    RefreshCredential = 'RefreshCredential',
}