export enum EventType {
    // Log
    LogPlatformInfo,
    LogProgress,

    // Sign
    CredentialInitializing,
    FetchFromLocalCredentialManager,
    UserSigningIn,
    UserSignedIn,
    UserSignedOut,
    SignInFailed,
    ResetUserInfo,
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