import { BaseEvent, PlatformInfoRetrieved, UserSignInSucceeded, UserSignInProgress, PackageInstallStarted, DownloadStarted, DownloadProgress, DownloadSizeObtained, DownloadValidating, ZipFileInstalling, RepositoryInfoRetrieved, APICallStarted, APICallFailed, BuildProgress, UserSignOutCompleted, UserSignOutFailed, UserSignInCompleted, UserSignInFailed, BuildStarted, BuildCompleted, DocfxRestoreCompleted, DocfxBuildCompleted, BuildFailed, DependencyInstallCompleted, PackageInstallCompleted, PackageInstallAttemptFailed, CancelBuildCompleted, CancelBuildFailed } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { DocfxExecutionResult } from '../build/buildResult';
import { INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME } from '../shared';
import { ILogger } from '../common/logger';

export class DocsLoggerObserver {
    private _downloadProgressDot: number;

    constructor(private _logger: ILogger) { }

    // Just for Test
    public get downloadProgressDot() {
        return this._downloadProgressDot;
    }

    // Just for Test
    public set downloadProgressDot(value: number) {
        this._downloadProgressDot = value;
    }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            // Sign
            case EventType.UserSignInCompleted:
                this.handleUserSignInCompleted(<UserSignInCompleted>event);
                break;
            case EventType.UserSignOutCompleted:
                this.handleUserSignOutCompleted(<UserSignOutCompleted>event);
                break;
            case EventType.UserSignInProgress:
                this.handleUserSignInProgress(<UserSignInProgress>event);
                break;
            case EventType.PublicContributorSignIn:
                this.handlePublicContributorSignIn();
                break;
            // Build
            case EventType.RepositoryInfoRetrieved:
                this.handleRepositoryInfoRetrieved(<RepositoryInfoRetrieved>event);
                break;
            case EventType.BuildTriggered:
                this.handleBuildTriggered();
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
            case EventType.CancelBuildCompleted:
                this.handleCancelBuildCompleted(<CancelBuildCompleted>event);
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
            case EventType.ExtensionActivated:
                this.handleExtensionActivated();
                break;
            case EventType.TriggerCommandWithUnkownUserType:
                this.handleTriggerCommandWithUnkownUserType();
                break;
        }
    }

    private appendLine(message?: string): void {
        this._logger.appendLine(message || '');
    }

    private append(message: string): void {
        this._logger.append(message);
    }

    // Sign
    private handleUserSignInCompleted(event: UserSignInCompleted) {
        if (event.succeeded) {
            const asUserSignInSucceeded = <UserSignInSucceeded>event;
            if (asUserSignInSucceeded.retrievedFromCache) {
                this.appendLine(`Successfully retrieved user credential from local credential manager:`);
            } else {
                this.appendLine(`Successfully signed in to Docs:`);
            }
            this.appendLine(`    - Platform: ${asUserSignInSucceeded.credential.userInfo.signType}`);
            this.appendLine(`    - Account: ${asUserSignInSucceeded.credential.userInfo.userName}`);
        } else {
            this.appendLine(`Failed to sign in to Docs: ${(<UserSignInFailed>event).err.message}`);
        }
        this.appendLine();
    }

    private handleUserSignOutCompleted(event: UserSignOutCompleted) {
        if (event.succeeded) {
            this.appendLine(`Successfully signed out from Docs.`);
        } else {
            this.appendLine(`Failed to sign out from Docs: ${(<UserSignOutFailed>event).err.message}`);
        }
        this.appendLine();
    }

    private handleUserSignInProgress(event: UserSignInProgress) {
        const tag = event.tag ? `[${event.tag}] ` : '';
        this.appendLine(`${tag}${event.message}`);
    }

    private handlePublicContributorSignIn() {
        this.appendLine(`Sign in failed: Sign in is only available for Microsoft employees.`);
    }

    // Build
    private handleRepositoryInfoRetrieved(event: RepositoryInfoRetrieved) {
        let repositoryUrl: string;
        if (event.originalRepositoryUrl !== event.localRepositoryUrl) {
            repositoryUrl = `${event.localRepositoryUrl}(original: ${event.originalRepositoryUrl})`;
        } else {
            repositoryUrl = event.localRepositoryUrl;
        }
        this.appendLine(`Repository information of current workspace folder:`);
        this.appendLine(`  Local repository URL: ${repositoryUrl}`);
        this.appendLine();
    }

    private handleBuildTriggered() {
        this.appendLine();
        this.appendLine('---------------------------');
        this.appendLine(`Preparing build context...`);
    }

    private handleBuildStarted(event: BuildStarted) {
        this.appendLine(`Start to build workspace folder '${event.workSpaceFolderName}'...`);
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
        this.appendLine(event.message.trimRight());
    }

    private handleDocfxRestoreCompleted(event: DocfxRestoreCompleted) {
        switch (event.result) {
            case DocfxExecutionResult.Succeeded:
                this.appendLine(`Restore finished, start to run 'docfx build'...`);
                break;
            case DocfxExecutionResult.Failed:
                this.appendLine(`Error: running 'docfx restore' failed with exit code: ${event.exitCode}`);
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
                this.appendLine(`Build finished, generating report...`);
                break;
            case DocfxExecutionResult.Failed:
                this.appendLine(`Error: running 'docfx build' failed with exit code: ${event.exitCode}`);
                break;
            case DocfxExecutionResult.Canceled:
                this.appendLine(`'docfx build' command has been canceled`);
                break;
        }
        this.appendLine();
    }

    private handleCancelBuildCompleted(event: CancelBuildCompleted) {
        if (!event.succeeded) {
            this.appendLine(`Failed to cancel the current validation: ${(<CancelBuildFailed>event).err.message}`);
            this.appendLine();
        }
    }

    // API
    private handleAPICallStarted(event: APICallStarted) {
        this.appendLine(`[OPBuildAPIClient.${event.name}] Calling API '${decodeURIComponent(event.url)}'...`);
    }

    private handleAPICallFailed(event: APICallFailed) {
        this.appendLine(`[OPBuildAPIClient.${event.name}] Call of API '${decodeURIComponent(event.url)}' failed: ${event.message}`);
    }

    // Runtime Dependency
    private handleDependencyInstallStarted() {
        this.appendLine(`Installing run-time dependencies...`);
    }

    private handleDependencyInstallCompleted(event: DependencyInstallCompleted) {
        if (event.succeeded) {
            this.appendLine('Run-time dependencies installation finished.');
        } else {
            this.appendLine('Installation of run-time dependencies failed and some features may not work as expected. Please restart Visual Studio Code to re-trigger the installation.');
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
            this.appendLine(`Package '${event.installedPackage.description}' installation failed after ${INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME} times attempt!`);
        }
        this.appendLine();
    }

    private handlePackageInstallAttemptFailed(event: PackageInstallAttemptFailed) {
        let msg = `Failed to install package '${event.installedPackage.description}': ${event.err.message}`;
        if (event.retryCount < INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME) {
            msg += ` Retrying...`;
        }
        this.appendLine(msg);
        this.appendLine();
    }

    private handleDownloadStarted(event: DownloadStarted) {
        this.append(`Downloading package '${event.pkgDescription}' `);
        this._downloadProgressDot = 0;
    }

    private handleDownloadSizeObtained(event: DownloadSizeObtained) {
        this.append(`(${Math.ceil(event.packageSize / 1024)} KB)`);
    }

    private handleDownloadProgress(event: DownloadProgress) {
        if (event.downloadPercentage === 100) {
            this.appendLine(` Done!`);
        } else {
            const newDownloadProgressDot = Math.ceil(event.downloadPercentage / 5);
            this.append('.'.repeat(newDownloadProgressDot - this._downloadProgressDot));
            this._downloadProgressDot = newDownloadProgressDot;
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

    private handleExtensionActivated() {
        this.appendLine(`Extension activated.`);
    }

    private handleTriggerCommandWithUnkownUserType() {
        this.appendLine(`Command triggered when user type is unknown.`);
    }
}