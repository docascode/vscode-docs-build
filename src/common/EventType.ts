export enum EventType {
    // Log
    LogPlatformInfo,
    LogProgress,

    // Sign
    CredentialInitializing,
    RetrieveFromLocalCredentialManager,
    UserSigningIn,
    UserSignedIn,
    UserSignedOut,
    SignInFailed,
    ResetCredential,
    CredentialExpiry,

    // Others
    EnvironmentChange,
    RefreshCredential,

    // Runtime dependency
    DependencyInstallStart,
    DependencyInstallSuccess,
    PackageInstallStart,
    PackageInstallSuccess,
    PackageInstallFailed,
    DownloadStart,
    DownloadProgress,
    DownloadSizeObtained,
    DownloadValidation,
    IntegrityCheckFailure,
    InstallZipFile,
}