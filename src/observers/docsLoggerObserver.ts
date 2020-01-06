import { OutputChannel } from 'vscode';
import { BaseEvent, PlatformInfoRetrieved, UserSignInSucceeded, SignInProgress, PackageInstallStarted, PackageInstallSucceeded, PackageInstallFailed, DownloadStarted, DownloadProgress, DownloadSizeObtained, DownloadValidating, DownloadIntegrityCheckFailed, ZipFileInstalling, CredentialRetrieveFromLocalCredentialManager } from '../common/loggingEvents';
import { EventType } from '../common/eventType';

export class DocsLoggerObserver {
    private downloadProgressDot: number;
    constructor(private logger: OutputChannel) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            // Sign
            case EventType.UserSignInSucceeded:
                this.handleUserSignInSucceeded(<UserSignInSucceeded>event);
                break;
            case EventType.CredentialRetrieveFromLocalCredentialManager:
                this.handleCredentialRetrieveFromLocalCredentialManager(<CredentialRetrieveFromLocalCredentialManager>event);
                break;
            case EventType.UserSignedOut:
                this.handleUserSignedOut();
                break;
            case EventType.SignInProgress:
                this.handleSignInProgress(<SignInProgress>event);
                break;
            // Runtime Dependency
            case EventType.DependencyInstallStarted:
                this.handleDependencyInstallStarted();
                break;
            case EventType.DependencyInstallFinished:
                this.handleDependencyInstallFinished();
                break;
            case EventType.PackageInstallStarted:
                this.handlePackageInstallStarted(<PackageInstallStarted>event);
                break;
            case EventType.PackageInstallSucceeded:
                this.handlePackageInstallSucceeded(<PackageInstallSucceeded>event);
                break;
            case EventType.PackageInstallFailed:
                this.handlePackageInstallFailed(<PackageInstallFailed>event);
                break;
            case EventType.DownloadStarted:
                this.handleDownloadStarted(<DownloadStarted>event);
                break;
            case EventType.DownloadSizeObtained:
                this.handleDownloadSizeObtained(<DownloadSizeObtained>event);
                break;
            case EventType.DownloadProgress:
                this.handleDownloadProgress(<DownloadProgress>event);
                break;
            case EventType.DownloadValidating:
                this.handleDownloadValidating(<DownloadValidating>event);
                break;
            case EventType.DownloadIntegrityCheckFailed:
                this.handleDownloadIntegrityCheckFailed(<DownloadIntegrityCheckFailed>event);
                break;
            case EventType.ZipFileInstalling:
                this.handleZipFileInstalling(<ZipFileInstalling>event);
                break;
            case EventType.PlatformInfoRetrieved:
                this.handlePlatformInfoRetrieved(<PlatformInfoRetrieved>event);
                break;
        }
    }

    private appendLine(message?: string): void {
        this.logger.appendLine(message || '');
    }

    private append(message: string): void {
        this.logger.append(message);
    }

    // Sign
    private handleUserSignInSucceeded(event: UserSignInSucceeded) {
        this.appendLine(`Successfully sign-in to Docs build system:`);
        this.appendLine(`    - GitHub Account: ${event.credential.userInfo.userName}`);
        this.appendLine(`    - User email   : ${event.credential.userInfo.userEmail}`);
        this.appendLine();
    }

    private handleCredentialRetrieveFromLocalCredentialManager(event: CredentialRetrieveFromLocalCredentialManager) {
        this.appendLine(`Successfully retrieved user credential from Local Credential Manager:`);
        this.appendLine(`    - GitHub Account: ${event.credential.userInfo.userName}`);
        this.appendLine(`    - User email   : ${event.credential.userInfo.userEmail}`);
        this.appendLine();
    }

    private handleUserSignedOut() {
        this.appendLine(`Successfully sign-out from Docs build system!`);
        this.appendLine();
    }

    private handleSignInProgress(event: SignInProgress) {
        let tag = event.tag ? `[${event.tag}] ` : '';
        this.appendLine(`${tag}${event.message}`);
    }

    // Runtime Dependency
    private handleDependencyInstallStarted() {
        this.appendLine(`Installing runtime dependencies...`);
    }

    private handleDependencyInstallFinished() {
        this.appendLine('Runtime dependencies installation finished!');
        this.appendLine();
    }

    private handlePackageInstallStarted(event: PackageInstallStarted) {
        this.appendLine(`Installing package '${event.pkgDescription}'...`);
    }

    private handlePackageInstallSucceeded(event: PackageInstallSucceeded) {
        this.appendLine(`Package '${event.pkgDescription}' installed!`);
        this.appendLine();
    }

    private handlePackageInstallFailed(event: PackageInstallFailed) {
        if (event.willRetry) {
            this.appendLine(`Failed to install package '${event.pkgDescription}': ${event.message}. Retrying..`);
        } else {
            this.appendLine(`Failed to install package '${event.pkgDescription}': ${event.message}. Some features may not work as expected. Please restart Visual Studio Code to re-trigger the download.`);
        }
        this.appendLine();
    }

    private handleDownloadStarted(event: DownloadStarted) {
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
        let newDownloadProgressDot = Math.ceil(event.downloadPercentage / 5);
        this.append('.'.repeat(newDownloadProgressDot - this.downloadProgressDot));
        this.downloadProgressDot = newDownloadProgressDot;
    }

    private handleDownloadValidating(event: DownloadValidating) {
        this.appendLine('Validating download...');
    }

    private handleDownloadIntegrityCheckFailed(event: DownloadIntegrityCheckFailed) {
        this.appendLine(`Package ${event.pkgDescription} download failed integrity check.`);
    }

    private handleZipFileInstalling(event: ZipFileInstalling) {
        this.appendLine(`Installing zip file...`);
    }

    private handlePlatformInfoRetrieved(event: PlatformInfoRetrieved) {
        this.appendLine(`Platform: ${event.platformInfo.toString()}`);
        this.appendLine();
    }
}