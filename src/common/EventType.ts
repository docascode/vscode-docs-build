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
    DependencyInstallStart,
    DependencyInstallFinished,
    PackageInstallStart,
    PackageInstallSucceeded,
    PackageInstallFailed,
    DownloadStart,
    DownloadProgress,
    DownloadSizeObtained,
    DownloadValidating,
    DownloadIntegrityCheckFailed,
    ZipFileInstalling,
    PlatformInfoRetrieved,

    // Others
    EnvironmentChanged,
}