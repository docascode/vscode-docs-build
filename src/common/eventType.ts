export enum EventType {
    // Sign
    CredentialExpired,
    CredentialInitializing,
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

    CancelBuildTriggered,
    CancelBuildCompleted,

    DocfxRestoreStarted,
    DocfxRestoreCompleted,
    DocfxBuildStarted,
    DocfxBuildCompleted,

    CalculateBuildCacheSize,

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