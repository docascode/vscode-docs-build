import { OutputChannel } from 'vscode';
import { BaseEvent, PlatformInfoRetrieved, UserSignInSucceeded, UserSignInProgress, PackageInstallStarted, PackageInstallSucceeded, PackageInstallFailed, DownloadStarted, DownloadProgress, DownloadSizeObtained, DownloadValidating, DownloadIntegrityCheckFailed, ZipFileInstalling, CredentialRetrieveFromLocalCredentialManager, RepositoryInfoRetrieved, APICallStarted, APICallFailed, BuildProgress, UserSignInCompleted, UserSignInFailed, BuildStarted, BuildCompleted, DocfxRestoreCompleted, DocfxBuildCompleted, BuildFailed } from '../common/loggingEvents';
import { EventType } from '../common/eventType';

export class DocsLoggerObserver {
    private downloadProgressDot: number;
    constructor(private logger: OutputChannel) { }

    // Just for Test
    public get downloadProgressDotValue() {
        return this.downloadProgressDot;
    }

    // Just for Test
    public set downloadProgressDotValue(value: number) {
        this.downloadProgressDot = value;
    }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            // Sign
            case EventType.UserSignInCompleted:
                this.handleUserSignInCompleted(<UserSignInCompleted>event);
                break;
            case EventType.CredentialRetrieveFromLocalCredentialManager:
                this.handleCredentialRetrieveFromLocalCredentialManager(<CredentialRetrieveFromLocalCredentialManager>event);
                break;
            case EventType.UserSignedOut:
                this.handleUserSignedOut();
                break;
            case EventType.UserSignInProgress:
                this.handleUserSignInProgress(<UserSignInProgress>event);
                break;
            // Build
            case EventType.RepositoryInfoRetrieved:
                this.handleRepositoryInfoRetrieved(<RepositoryInfoRetrieved>event);
                break;
            case EventType.BuildInstantAllocated:
                this.handleBuildInstantAllocated();
                break;
            case EventType.BuildStarted:
                this.handleBuildStarted(<BuildStarted>event);
                break;
            case EventType.BuildCompleted:
                this.handleBuildCompleted(<BuildCompleted>event);
                break;
            case EventType.BuildProgress:
                this.handleBuildProgress(<BuildProgress>event);
                break;
            case EventType.DocfxRestoreCompleted:
                this.handleDocfxRestoreCompleted(<DocfxRestoreCompleted>event);
                break;
            case EventType.DocfxBuildCompleted:
                this.handleDocfxBuildCompleted(<DocfxBuildCompleted>event);
                break;
            // API
            case EventType.APICallStarted:
                this.handleAPICallStarted(<APICallStarted>event);
                break;
            case EventType.APICallFailed:
                this.handleAPICallFailed(<APICallFailed>event);
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
    private handleUserSignInCompleted(event: UserSignInCompleted) {
        if (event.succeeded) {
            let asUserSignInSucceeded = <UserSignInSucceeded>event;
            this.appendLine(`Successfully sign-in to Docs Build:`);
            this.appendLine(`    - GitHub Account: ${asUserSignInSucceeded.credential.userInfo.userName}`);
            this.appendLine(`    - User email    : ${asUserSignInSucceeded.credential.userInfo.userEmail}`);
        } else {
            this.appendLine(`Failed to sign-in to Docs Build: ${(<UserSignInFailed>event).err.message}`);
        }
        this.appendLine();
    }

    private handleCredentialRetrieveFromLocalCredentialManager(event: CredentialRetrieveFromLocalCredentialManager) {
        this.appendLine(`Successfully retrieved user credential from Local Credential Manager:`);
        this.appendLine(`    - GitHub Account: ${event.credential.userInfo.userName}`);
        this.appendLine(`    - User email    : ${event.credential.userInfo.userEmail}`);
        this.appendLine();
    }

    private handleUserSignedOut() {
        this.appendLine(`Successfully sign-out from Docs Build!`);
        this.appendLine();
    }

    private handleUserSignInProgress(event: UserSignInProgress) {
        let tag = event.tag ? `[${event.tag}] ` : '';
        this.appendLine(`${tag}${event.message}`);
    }

    // Build
    private handleRepositoryInfoRetrieved(event: RepositoryInfoRetrieved) {
        let repositoryUrl: string;
        if (event.originalRepositoryUrl !== event.localRepositoryUrl) {
            repositoryUrl = `${event.localRepositoryUrl}(original: ${event.originalRepositoryUrl})`;
        } else {
            repositoryUrl = event.localRepositoryUrl;
        }
        this.appendLine(`Repository Information of current workspace folder:`);
        this.appendLine(`  Local Repository URL: ${repositoryUrl}`);
        this.appendLine();
    }

    private handleBuildInstantAllocated() {
        this.appendLine();
        this.appendLine('---------------------------');
        this.appendLine(`Preparing build context...`);
    }

    private handleBuildStarted(event: BuildStarted) {
        this.appendLine(`Start to build workspace folder '${event.workSpaceFolderName}'`);
    }

    private handleBuildCompleted(event: BuildCompleted) {
        switch (event.result) {
            case 'Succeeded':
                this.appendLine(`Report generated, please view them in 'PROBLEMS' tab`);
                break;
            case 'Canceled':
                this.appendLine('Build has been canceled');
                break;
            case 'Failed':
                this.appendLine(`Build failed: ${(<BuildFailed>event).err.message}`);
                break;
        }
        this.appendLine();
    }

    private handleBuildProgress(event: BuildProgress) {
        this.appendLine(`${event.message}`);
    }

    private handleDocfxRestoreCompleted(event: DocfxRestoreCompleted) {
        switch (event.result) {
            case 'Succeeded':
                this.appendLine(`Restore Finished, start to run 'docfx build'...`);
                break;
            case 'Failed':
                this.appendLine(`Error: Running 'docfx restore' failed with exit code: ${event.exitCode}`);
                break;
            case 'Canceled':
                this.appendLine(`'docfx restore' command has been canceled, skip running 'docfx build'`);
                break;
        }
        this.appendLine();
    }

    private handleDocfxBuildCompleted(event: DocfxBuildCompleted) {
        switch (event.result) {
            case 'Succeeded':
                this.appendLine(`Build Finished, Generating report...`);
                break;
            case 'Failed':
                this.appendLine(`Error: Running 'docfx build' failed with exit code: ${event.exitCode}`);
                break;
            case 'Canceled':
                this.appendLine(`'docfx build' command has been canceled`);
                break;
        }
        this.appendLine();
    }

    // API
    private handleAPICallStarted(event: APICallStarted) {
        this.appendLine(`[OPBuildAPIClient.${event.name}] Calling API '${decodeURIComponent(event.url)}'...`);
    }

    private handleAPICallFailed(event: APICallFailed) {
        this.appendLine(`[OPBuildAPIClient.${event.name}] Call API '${decodeURIComponent(event.url)}' failed: ${event.message}`);
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
        } else {
            let newDownloadProgressDot = Math.ceil(event.downloadPercentage / 5);
            this.append('.'.repeat(newDownloadProgressDot - this.downloadProgressDot));
            this.downloadProgressDot = newDownloadProgressDot;
        }
    }

    private handleDownloadValidating(event: DownloadValidating) {
        this.appendLine('Validating download...');
    }

    private handleDownloadIntegrityCheckFailed(event: DownloadIntegrityCheckFailed) {
        this.appendLine(`Package download failed integrity check.`);
    }

    private handleZipFileInstalling(event: ZipFileInstalling) {
        this.appendLine(`Installing zip file...`);
    }

    private handlePlatformInfoRetrieved(event: PlatformInfoRetrieved) {
        this.appendLine(`Platform: ${event.platformInfo.toString()}`);
        this.appendLine();
    }
}