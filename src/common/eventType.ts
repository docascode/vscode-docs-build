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

    // API
    APICallStarted,
    APICallFailed,

    // Runtime dependency
    DependencyInstallStarted,
    DependencyInstallFinished,
    PackageInstallStarted,
    PackageInstallSucceeded,
    PackageInstallFailed,
    DownloadStarted,
    DownloadProgress,
    DownloadSizeObtained,
    DownloadValidating,
    DownloadIntegrityCheckFailed,
    ZipFileInstalling,
    PlatformInfoRetrieved,

    // Others
    EnvironmentChanged,
    LearnMoreClicked,

    // Test only
    RefreshCredential,
}