export enum EventType {
    // Sign
    CredentialExpired,
    CredentialInitializing,
    CredentialRetrieveFromLocalCredentialManager,
    CredentialReset,
    UserSignInTriggered,
    UserSignInProgress,
    UserSignInCompleted,
    UserSignOutTriggered,
    UserSignOutCompleted,

    // Build
    RepositoryEnabledV3,
    RepositoryInfoRetrieved,

    BuildInstantReleased,
    BuildInstantAllocated,

    BuildTriggered,
    BuildStarted,
    BuildProgress,
    BuildCompleted,

    DocfxRestoreStarted,
    DocfxRestoreCompleted,
    DocfxBuildStarted,
    DocfxBuildCompleted,

    BuildCacheSizeCalculated,

    // API
    APICallStarted,
    APICallFailed,

    // Runtime dependency
    DependencyInstallStarted,
    DependencyInstallCompleted,
    PackageInstallStarted,
    PackageInstallCompleted,
    PackageInstallAttemptFailed,
    DownloadStarted,
    DownloadProgress,
    DownloadSizeObtained,
    DownloadValidating,
    ZipFileInstalling,
    PlatformInfoRetrieved,

    // Others
    EnvironmentChanged,
    QuickPickTriggered,
    QuickPickCommandSelected,
    LearnMoreClicked,

    // Test only
    RefreshCredential,
}