export enum EventType {
    // Sign
    CredentialExpired,
    CredentialInitializing,
    CredentialRetrieveFromLocalCredentialManager,
    CredentialReset,
    UserSignInProgress,
    UserSigningIn,
    UserSignInSucceeded,
    UserSignInFailed,
    UserSignedOut,

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

    // Test only
    RefreshCredential,
}