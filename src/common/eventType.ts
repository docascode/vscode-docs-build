export enum EventType {
    // Sign
    CredentialInitializing,
    SignInProgress,
    CredentialRetrieveFromLocalCredentialManager,
    UserSigningIn,
    UserSignInSucceeded,
    UserSignInFailed,
    UserSignedOut,
    CredentialReset,
    CredentialExpired,

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
}