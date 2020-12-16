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
    PublicContributorSignIn,
    UserTypeChange,

    // Build
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
    TriggerCommandWithUnknownUserType,
    ExtensionActivated,

    // Language Server
    StartLanguageServerCompleted,

    // Test only
    RefreshCredential,
}