export enum EventType {
    // Sign
    CredentialExpired,
    CredentialInitializing,
    CredentialRetrieveFromLocalCredentialManager,
    CredentialReset,
    UserSignInTriggered,
    UserSignInProgress,
    UserSignInCompleted,
    UserSignedOut,

    // Build
    RepositoryEnabledV3,
    RepositoryInfoRetrieved,

    BuildInstantReleased,
    BuildInstantAllocated,
    BuildTriggerFailed,
    BuildJobTriggered,
    BuildJobSucceeded,
    BuildJobFailed,
    BuildProgress,

    DocfxRestoreStarted,
    DocfxRestoreFinished,
    DocfxRestoreCanceled,
    DocfxBuildStarted,
    DocfxBuildFinished,
    DocfxBuildCanceled,

    ReportGenerationFailed,

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