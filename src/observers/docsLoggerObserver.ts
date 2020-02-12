import { OutputChannel } from 'vscode';
import { BaseEvent, PlatformInfoRetrieved, UserSignInSucceeded, UserSignInProgress, PackageInstallStarted, PackageInstallSucceeded, PackageInstallFailed, DownloadStarted, DownloadProgress, DownloadSizeObtained, DownloadValidating, DownloadIntegrityCheckFailed, ZipFileInstalling, CredentialRetrieveFromLocalCredentialManager, BuildTriggerFailed, RepositoryInfoRetrieved, ReportGenerationFailed, BuildJobTriggered, BuildJobSucceeded, APICallStarted, APICallFailed, DocfxBuildFinished, DocfxRestoreFinished, BuildProgress, DocfxRestoreCanceled, DocfxBuildCanceled, UserSignInCompleted, UserSignInFailed, UserSignOutCompleted, UserSignOutFailed } from '../common/loggingEvents';
import { EventType } from '../common/eventType';

export class DocsLoggerObserver {
    private downloadProgressDot: number;
    constructor(private logger: OutputChannel) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            // Sign
            case EventType.UserSignInCompleted:
                this.handleUserSignInCompleted(<UserSignInCompleted>event);
                break;
            case EventType.CredentialRetrieveFromLocalCredentialManager:
                this.handleCredentialRetrieveFromLocalCredentialManager(<CredentialRetrieveFromLocalCredentialManager>event);
                break;
            case EventType.UserSignOutCompleted:
                this.handleUserSignOutCompleted(<UserSignOutCompleted>event);
                break;
            case EventType.UserSignInProgress:
                this.handleUserSignInProgress(<UserSignInProgress>event);
                break;
            // Build
            case EventType.RepositoryInfoRetrieved:
                this.handleRepositoryInfoRetrieved(<RepositoryInfoRetrieved>event);
                break;
            case EventType.BuildInstantAllocated:
                this.handleBuildInstantAlloc();
                break;
            case EventType.BuildTriggerFailed:
                this.handleBuildTriggerError(<BuildTriggerFailed>event);
                break;
            case EventType.BuildJobTriggered:
                this.handleBuildJobTriggered(<BuildJobTriggered>event);
                break;
            case EventType.DocfxRestoreFinished:
                this.handleDocfxRestoreFinished(<DocfxRestoreFinished>event);
                break;
            case EventType.DocfxRestoreCanceled:
                this.handleDocfxRestoreCanceled(<DocfxRestoreCanceled>event);
                break;
            case EventType.DocfxBuildFinished:
                this.handleDocfxBuildFinished(<DocfxBuildFinished>event);
                break;
            case EventType.DocfxBuildCanceled:
                this.handleDocfxBuildCanceled(<DocfxBuildCanceled>event);
                break;
            case EventType.ReportGenerationFailed:
                this.handlerReportGenerationFailed(<ReportGenerationFailed>event);
                break;
            case EventType.BuildJobSucceeded:
                this.handleBuildJobSucceeded(<BuildJobSucceeded>event);
                break;
            case EventType.BuildProgress:
                this.handleBuildProgress(<BuildProgress>event);
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
            this.appendLine(`    - User email   : ${asUserSignInSucceeded.credential.userInfo.userEmail}`);
        } else {
            this.appendLine(`Failed to sign-in to Docs Build: ${(<UserSignInFailed>event).err.message}`);
        }
        this.appendLine();
    }

    private handleCredentialRetrieveFromLocalCredentialManager(event: CredentialRetrieveFromLocalCredentialManager) {
        this.appendLine(`Successfully retrieved user credential from Local Credential Manager:`);
        this.appendLine(`    - GitHub Account: ${event.credential.userInfo.userName}`);
        this.appendLine(`    - User email   : ${event.credential.userInfo.userEmail}`);
        this.appendLine();
    }

    private handleUserSignOutCompleted(event: UserSignOutCompleted) {
        if (event.succeeded) {
            this.appendLine(`Successfully sign-out from Docs Build!`);
        } else {
            this.appendLine(`Failed to sign-out from Docs Build: ${(<UserSignOutFailed>event).err.message}`);
        }
        this.appendLine();
    }

    private handleUserSignInProgress(event: UserSignInProgress) {
        let tag = event.tag ? `[${event.tag}] ` : '';
        this.appendLine(`${tag}${event.message}`);
    }

    // Build
    private handleRepositoryInfoRetrieved(event: RepositoryInfoRetrieved) {
        let repositoryUrl: string;
        if (event.sourceRepositoryUrl !== event.repositoryUrl) {
            repositoryUrl = `${event.repositoryUrl}(original: ${event.sourceRepositoryUrl})`;
        } else {
            repositoryUrl = event.repositoryUrl;
        }
        this.appendLine(`Repository Information of current workspace folder:`);
        this.appendLine(`  Repository URL: ${repositoryUrl}`);
        this.appendLine(`  Repository Branch: ${event.repositoryBranch}`);
        this.appendLine();
    }

    private handleBuildInstantAlloc() {
        this.appendLine();
        this.appendLine('---------------------------');
        this.appendLine(`Preparing build context...`);
    }

    private handleBuildTriggerError(event: BuildTriggerFailed) {
        this.appendLine(`Cannot trigger build: ${event.message}`);
    }

    private handleBuildJobTriggered(event: BuildJobTriggered) {
        this.appendLine(`Start to build workspace folder '${event.workSpaceFolderName}'`);
    }

    private handlerReportGenerationFailed(event: ReportGenerationFailed) {
        this.appendLine(`Error happened when visualizing the build report: '${event.message}'`);
        this.appendLine();
    }

    private handleDocfxRestoreFinished(event: DocfxRestoreFinished) {
        if (event.exitCode !== 0) {
            this.appendLine(`Error: Running 'docfx restore' failed with exit code: ${event.exitCode}`);
        } else {
            this.appendLine(`Restore Finished, start to run 'docfx build'...`);
        }
        this.appendLine();
    }

    private handleDocfxRestoreCanceled(event: DocfxRestoreCanceled) {
        this.appendLine(`'docfx restore' command has been canceled, skip running 'docfx build'`);
    }

    private handleDocfxBuildCanceled(event: DocfxBuildCanceled) {
        this.appendLine(`'docfx build' command has been canceled`);
    }

    private handleDocfxBuildFinished(event: DocfxBuildFinished) {
        if (event.exitCode !== 0) {
            this.appendLine(`Error: Running 'docfx build' failed with exit code: ${event.exitCode}`);
        } else {
            this.appendLine(`Build Finished, Generating report...`);
        }
        this.appendLine();
    }

    private handleBuildJobSucceeded(event: BuildJobSucceeded) {
        this.appendLine('Report generated, please view them in `PROBLEMS` tab');
    }

    private handleBuildProgress(event: BuildProgress) {
        this.appendLine(`${event.message}`);
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
        }
        let newDownloadProgressDot = Math.ceil(event.downloadPercentage / 5);
        this.append('.'.repeat(newDownloadProgressDot - this.downloadProgressDot));
        this.downloadProgressDot = newDownloadProgressDot;
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