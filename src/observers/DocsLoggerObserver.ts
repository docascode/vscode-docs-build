import { OutputChannel } from "vscode";
import { BaseEvent, LogPlatformInfo, UserSignedIn, LogProgress, PackageInstallStart, PackageInstallSuccess, PackageInstallFailed, DownloadStart, DownloadProgress, DownloadSizeObtained, DownloadValidation, IntegrityCheckFailure, InstallZipFile, FetchFromLocalCredentialManager } from "../common/loggingEvents";
import { EventType } from "../common/EventType";

export class DocsLoggerObserver {
    private downloadProgressDot: number;
    constructor(private logger: OutputChannel) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            // Log
            case EventType.LogPlatformInfo:
                this.handleLogPlatformInfo(<LogPlatformInfo>event);
                break;
            case EventType.LogProgress:
                this.handleLogProgress(<LogProgress>event);
                break;
            // Sign
            case EventType.UserSignedIn:
                this.handleUserSignedIn(<UserSignedIn>event);
                break;
            case EventType.FetchFromLocalCredentialManager:
                this.handleFetchFromLocalCredentialManager(<FetchFromLocalCredentialManager>event);
                break;
            case EventType.UserSignedOut:
                this.handleUserSignedOut();
                break;
            // Runtime Dependency
            case EventType.DependencyInstallStart:
                this.handleDependencyInstallStart();
                break;
            case EventType.DependencyInstallSuccess:
                this.handleDependencyInstallSuccess();
                break;
            case EventType.PackageInstallStart:
                this.handlePackageInstallStart(<PackageInstallStart>event);
                break;
            case EventType.PackageInstallSuccess:
                this.handlePackageInstallSuccess(<PackageInstallSuccess>event);
                break;
            case EventType.PackageInstallFailed:
                this.handlePackageInstallFailed(<PackageInstallFailed>event);
                break;
            case EventType.DownloadStart:
                this.handleDownloadStart(<DownloadStart>event);
                break;
            case EventType.DownloadSizeObtained:
                this.handleDownloadSizeObtained(<DownloadSizeObtained>event);
                break;
            case EventType.DownloadProgress:
                this.handleDownloadProgress(<DownloadProgress>event);
                break;
            case EventType.DownloadValidation:
                this.handleDownloadValidation(<DownloadValidation>event);
                break;
            case EventType.IntegrityCheckFailure:
                this.handleIntegrityCheckFailure(<IntegrityCheckFailure>event);
                break;
            case EventType.InstallZipFile:
                this.handleInstallZipFile(<InstallZipFile>event);
                break;
        }
    }

    private appendLine(message?: string): void {
        this.logger.appendLine(message || "");
    }

    private append(message: string): void {
        this.logger.append(message);
    }

    // Log
    private handleLogPlatformInfo(event: LogPlatformInfo) {
        this.appendLine(`Platform: ${event.platformInfo.toString()}`);
        this.appendLine();
    }

    private handleLogProgress(event: LogProgress) {
        let tag = event.tag ? `[${event.tag}] ` : '';
        this.appendLine(`${tag}${event.message}`);
    }

    // Sign
    private handleUserSignedIn(event: UserSignedIn) {
        this.appendLine(`Successfully sign in to Docs build system:`);
        this.appendLine(`    - Github Acount: ${event.credential.userInfo.userName}`);
        this.appendLine(`    - User email   : ${event.credential.userInfo.userEmail}`);
        this.appendLine();
    }

    private handleFetchFromLocalCredentialManager(event: FetchFromLocalCredentialManager) {
        this.appendLine(`Successfully get User credential From Local Credential Manager:`);
        this.appendLine(`    - Github Acount: ${event.credential.userInfo.userName}`);
        this.appendLine(`    - User email   : ${event.credential.userInfo.userEmail}`);
        this.appendLine();
    }

    private handleUserSignedOut() {
        this.appendLine(`Successfully sign out from Docs build system!`);
        this.appendLine();
    }

    // Runtime Dependency
    private handleDependencyInstallStart() {
        this.appendLine(`Installing runtime dependencies...`);
    }

    private handleDependencyInstallSuccess() {
        this.appendLine('Runtime dependencies installation finished!');
        this.appendLine();
    }

    private handlePackageInstallStart(event: PackageInstallStart) {
        this.appendLine(`Installing package '${event.pkgDescription}'...`);
    }

    private handlePackageInstallSuccess(event: PackageInstallSuccess) {
        this.appendLine(`Package '${event.pkgDescription}' installed!`);
        this.appendLine();
    }

    private handlePackageInstallFailed(event: PackageInstallFailed) {
        if (event.willRetry) {
            this.appendLine(`Failed to install package '${event.pkgDescription}': ${event.message}. Retrying..`);
        } else {
            this.appendLine(`Failed to install package '${event.pkgDescription}': ${event.message}. Some features may not work as expected. Please restart Visual Studio Code to retrigger the download.`);
        }
        this.appendLine();
    }

    private handleDownloadStart(event: DownloadStart) {
        this.append(`Downloading package '${event.pkgDescription}' `);
        this.downloadProgressDot = 0;
    }

    private handleDownloadSizeObtained(event: DownloadSizeObtained) {
        this.append(`(${Math.ceil(event.packageSize / 1024)} KB)`);
    }

    private handleDownloadProgress(event: DownloadProgress) {
        if (event.downloadPercentage === 100) {
            this.appendLine(` Done!`);
        }
        let newdownloadProgressDot = Math.ceil(event.downloadPercentage / 5);
        this.append('.'.repeat(newdownloadProgressDot - this.downloadProgressDot));
        this.downloadProgressDot = newdownloadProgressDot;
    }

    private handleDownloadValidation(event: DownloadValidation) {
        this.appendLine("Validating download...");
    }

    private handleIntegrityCheckFailure(event: IntegrityCheckFailure) {
        this.appendLine(`Package ${event.pkgDescription} download failed integrity check.`);
    }

    private handleInstallZipFile(event: InstallZipFile) {
        this.appendLine(`Installing zip file...`);
    }
}