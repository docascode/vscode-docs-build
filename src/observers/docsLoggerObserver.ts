import { OutputChannel } from 'vscode';
import { BaseEvent, PlatformInfoRetrieved, UserSignInSucceeded, UserSignInProgress, PackageInstallStarted, DownloadStarted, DownloadProgress, DownloadSizeObtained, DownloadValidating, ZipFileInstalling, CredentialRetrieveFromLocalCredentialManager, RepositoryInfoRetrieved, APICallStarted, APICallFailed, BuildProgress, UserSignOutCompleted, UserSignOutFailed, UserSignInCompleted, UserSignInFailed, BuildStarted, BuildCompleted, DocfxRestoreCompleted, DocfxBuildCompleted, BuildFailed, DependencyInstallCompleted, PackageInstallCompleted, PackageInstallAttemptFailed } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { DocfxExecutionResult } from '../build/buildResult';
import { INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME } from '../shared';

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
            case EventType.DependencyInstallCompleted:
                this.handleDependencyInstallCompleted(<DependencyInstallCompleted>event);
                break;
            case EventType.PackageInstallStarted:
                this.handlePackageInstallStarted(<PackageInstallStarted>event);
                break;
            case EventType.PackageInstallCompleted:
                this.handlePackageInstallCompleted(<PackageInstallCompleted>event);
                break;
            case EventType.PackageInstallAttemptFailed:
                this.handlePackageInstallAttemptFailed(<PackageInstallAttemptFailed>event);
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
            case DocfxExecutionResult.Succeeded:
                this.appendLine(`Report generated, please view them in 'PROBLEMS' tab`);
                break;
            case DocfxExecutionResult.Canceled:
                this.appendLine('Build has been canceled');
                break;
            case DocfxExecutionResult.Failed:
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
            case DocfxExecutionResult.Succeeded:
                this.appendLine(`Restore Finished, start to run 'docfx build'...`);
                break;
            case DocfxExecutionResult.Failed:
                this.appendLine(`Error: Running 'docfx restore' failed with exit code: ${event.exitCode}`);
                break;
            case DocfxExecutionResult.Canceled:
                this.appendLine(`'docfx restore' command has been canceled, skip running 'docfx build'`);
                break;
        }
        this.appendLine();
    }

    private handleDocfxBuildCompleted(event: DocfxBuildCompleted) {
        switch (event.result) {
            case DocfxExecutionResult.Succeeded:
                this.appendLine(`Build Finished, Generating report...`);
                break;
            case DocfxExecutionResult.Failed:
                this.appendLine(`Error: Running 'docfx build' failed with exit code: ${event.exitCode}`);
                break;
            case DocfxExecutionResult.Canceled:
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

    private handleDependencyInstallCompleted(event: DependencyInstallCompleted) {
        if (event.succeeded) {
            this.appendLine('Runtime dependencies installation finished!');
        } else {
            this.appendLine('Install runtime dependencies failed, some features may not work as expected. Please restart Visual Studio Code to re-trigger the download.');
        }
        this.appendLine();
    }

    private handlePackageInstallStarted(event: PackageInstallStarted) {
        this.appendLine(`Installing package '${event.pkgDescription}'...`);
    }

    private handlePackageInstallCompleted(event: PackageInstallCompleted) {
        if (event.succeeded) {
            this.appendLine(`Package '${event.installedPackage.description}' installed!`);
        } else {
            this.appendLine(`Package '${event.installedPackage.description}' install failed after ${INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME} times try!`);
        }
        this.appendLine();
    }

    private handlePackageInstallAttemptFailed(event: PackageInstallAttemptFailed) {
        let msg = `Failed to install package '${event.installedPackage.description}': ${event.err.message}`;
        if (event.retryCount < INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME) {
            msg += ` Retrying..`;
        }
        this.appendLine(msg);
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

    private handleZipFileInstalling(event: ZipFileInstalling) {
        this.appendLine(`Installing zip file...`);
    }

    private handlePlatformInfoRetrieved(event: PlatformInfoRetrieved) {
        this.appendLine(`Platform: ${event.platformInfo.toString()}`);
        this.appendLine();
    }
}