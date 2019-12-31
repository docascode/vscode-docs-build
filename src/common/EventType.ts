export enum EventType {
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