import assert from 'assert';
import { OutputChannel } from 'vscode';
import { UserSignInSucceeded, UserSignInProgress, RepositoryInfoRetrieved, BuildProgress, APICallStarted, APICallFailed, DependencyInstallStarted, PackageInstallStarted, DownloadStarted, DownloadSizeObtained, DownloadProgress, DownloadValidating, ZipFileInstalling, PlatformInfoRetrieved, UserSignInFailed, UserSignOutSucceeded, UserSignOutFailed, BuildStarted, BuildSucceeded, BuildCanceled, BuildFailed, DocfxRestoreCompleted, DocfxBuildCompleted, DependencyInstallCompleted, PackageInstallCompleted, PackageInstallAttemptFailed, CancelBuildFailed, BuildTriggered } from '../../../src/common/loggingEvents';
import { DocsLoggerObserver } from '../../../src/observers/docsLoggerObserver';
import { PlatformInformation } from '../../../src/common/platformInformation';
import { DocfxExecutionResult } from '../../../src/build/buildResult';
import { fakedPackage, fakedCredential } from '../../utils/faker';

describe('DocsLoggerObserver', () => {
    let loggerText: string;
    let observer: DocsLoggerObserver;

    let logger = <OutputChannel>{
        appendLine: (msg: string) => { loggerText += `${msg}\n`; },
        append: (msg: string) => { loggerText += `${msg}`; }
    };

    before(() => {
        observer = new DocsLoggerObserver(logger);
    });

    beforeEach(() => {
        loggerText = '';
    });

    describe('UserSignInCompleted', () => {
        it(`UserSignInSucceeded`, () => {
            let event = new UserSignInSucceeded('FakedCorrelationId', fakedCredential);
            observer.eventHandler(event);

            let expectedOutput = `Successfully signed in to Docs:\n`
                + `    - Platform: GitHub\n`
                + `    - Account: Faked User\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('UserSignInFailed', () => {
            let event = new UserSignInFailed('FakedCorrelationId', new Error('Faked error msg'));
            observer.eventHandler(event);

            let expectedOutput = `Failed to sign in to Docs: Faked error msg\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`CredentialRetrieveFromLocalCredentialManager`, () => {
            let event = new UserSignInSucceeded('fakedCorrelationId', fakedCredential, true);
            observer.eventHandler(event);
    
            let expectedOutput = `Successfully retrieved user credential from local credential manager:\n`
                + `    - Platform: GitHub\n`
                + `    - Account: Faked User\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('UserSignOutCompleted', () => {
        it(`UserSignOutSucceeded`, () => {
            let event = new UserSignOutSucceeded('FakedCorrelationId');
            observer.eventHandler(event);

            let expectedOutput = `Successfully signed out from Docs.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`UserSignOutFailed`, () => {
            let event = new UserSignOutFailed('FakedCorrelationId', new Error('Faked error msg'));
            observer.eventHandler(event);

            let expectedOutput = `Failed to sign out from Docs: Faked error msg\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`UserSignInProgress`, () => {
        let event = new UserSignInProgress(`Faked process msg`, 'Faked Tag');
        observer.eventHandler(event);

        let expectedOutput = `[Faked Tag] Faked process msg\n`;
        assert.equal(loggerText, expectedOutput);
    });

    // Build
    describe(`RepositoryInfoRetrieved`, () => {
        it(`Same original repository url with local repository url`, () => {
            let event = new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.repository');
            observer.eventHandler(event);

            let expectedOutput = `Repository information of current workspace folder:\n`
                + `  Local repository URL: https://faked.repository\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Different original repository url with local repository url`, () => {
            let event = new RepositoryInfoRetrieved('https://faked.local.repository', 'https://faked.original.repository');
            observer.eventHandler(event);

            let expectedOutput = `Repository information of current workspace folder:\n`
                + `  Local repository URL: https://faked.local.repository(original: https://faked.original.repository)\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`BuildInstantAllocated`, () => {
        let event = new BuildTriggered('FakedCorrelationId', true);
        observer.eventHandler(event);

        let expectedOutput = `\n---------------------------\n`
            + `Preparing build context...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`BuildStarted`, () => {
        let event = new BuildStarted('FakedWorkspaceFolderName');
        observer.eventHandler(event);

        let expectedOutput = `Start to build workspace folder 'FakedWorkspaceFolderName'...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('BuildCompleted', () => {
        it('BuildSucceeded', () => {
            let event = new BuildSucceeded('FakedCorrelationId', undefined, 10, undefined);
            observer.eventHandler(event);

            let expectedOutput = `Report generated, please view them in 'PROBLEMS' tab\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('BuildCanceled', () => {
            let event = new BuildCanceled('FakedCorrelationId', undefined, 10);
            observer.eventHandler(event);

            let expectedOutput = `Build has been canceled\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('BuildFailed', () => {
            let event = new BuildFailed('FakedCorrelationId', undefined, 10, new Error('Faked error msg'));
            observer.eventHandler(event);

            let expectedOutput = `Build failed: Faked error msg\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`BuildProgress`, () => {
        let event = new BuildProgress('faked msg');
        observer.eventHandler(event);

        let expectedOutput = `faked msg\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('DocfxRestoreCompleted', () => {
        it(`Docfx Restore succeeded`, () => {
            let event = new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Succeeded);
            observer.eventHandler(event);

            let expectedOutput = `Restore finished, start to run 'docfx build'...\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Restore failed`, () => {
            let event = new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Failed, 1);
            observer.eventHandler(event);

            let expectedOutput = `Error: running 'docfx restore' failed with exit code: 1\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Restore canceled`, () => {
            let event = new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Canceled);
            observer.eventHandler(event);

            let expectedOutput = `'docfx restore' command has been canceled, skip running 'docfx build'\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('DocfxBuildFinished', () => {
        it(`Docfx Build succeeded`, () => {
            let event = new DocfxBuildCompleted(DocfxExecutionResult.Succeeded);
            observer.eventHandler(event);

            let expectedOutput = `Build finished, generating report...\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Build failed`, () => {
            let event = new DocfxBuildCompleted(DocfxExecutionResult.Failed, 1);
            observer.eventHandler(event);

            let expectedOutput = `Error: running 'docfx build' failed with exit code: 1\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Build canceled`, () => {
            let event = new DocfxBuildCompleted(DocfxExecutionResult.Canceled);
            observer.eventHandler(event);

            let expectedOutput = `'docfx build' command has been canceled\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`Cancel Build failed`, () => {
        let event = new CancelBuildFailed('fakedcorrelationId', new Error('Faked error message'));
        observer.eventHandler(event);

        let expectedOutput = `Failed to cancel the current validation: Faked error message\n\n`;
        assert.equal(loggerText, expectedOutput);
    });

    // API
    it(`APICallStarted`, () => {
        let event = new APICallStarted('FakedAPIName', 'https://faked.api');
        observer.eventHandler(event);

        let expectedOutput = `[OPBuildAPIClient.FakedAPIName] Calling API 'https://faked.api'...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`APICallFailed`, () => {
        let event = new APICallFailed('FakedAPIName', 'https://faked.api', 'Faked msg');
        observer.eventHandler(event);

        let expectedOutput = `[OPBuildAPIClient.FakedAPIName] Call of API 'https://faked.api' failed: Faked msg\n`;
        assert.equal(loggerText, expectedOutput);
    });

    // Runtime Dependency
    it(`DependencyInstallStarted`, () => {
        let event = new DependencyInstallStarted('fakedCorrelationId');
        observer.eventHandler(event);

        let expectedOutput = `Installing run-time dependencies...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('DependencyInstallCompleted', () => {
        it(`Succeeded`, () => {
            let event = new DependencyInstallCompleted('fakedCorrelationId', true, 10);
            observer.eventHandler(event);

            let expectedOutput = `Run-time dependencies installation finished.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Failed`, () => {
            let event = new DependencyInstallCompleted('fakedCorrelationId', false, 10);
            observer.eventHandler(event);

            let expectedOutput = `Installation of run-time dependencies failed and some features may not work as expected. Please restart Visual Studio Code to re-trigger the installation.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`PackageInstallStarted`, () => {
        let event = new PackageInstallStarted('Faked package description');
        observer.eventHandler(event);

        let expectedOutput = `Installing package 'Faked package description'...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('PackageInstallCompleted', () => {
        it(`Succeeded`, () => {
            let event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, true, 0, 10);
            observer.eventHandler(event);

            let expectedOutput = `Package 'Faked package description' installed!\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Failed`, () => {
            let event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, false, 3, 10);
            observer.eventHandler(event);

            let expectedOutput = `Package 'Faked package description' installation failed after 3 times attempt!\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('PackageInstallAttemptFailed', () => {
        it(`Will Retry`, () => {
            let event = new PackageInstallAttemptFailed('FakedCorrelationId', fakedPackage, 1, new Error('Faked error msg.'));
            observer.eventHandler(event);

            let expectedOutput = `Failed to install package 'Faked package description': Faked error msg. Retrying...\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Will not Retry`, () => {
            let event = new PackageInstallAttemptFailed('FakedCorrelationId', fakedPackage, 3, new Error('Faked error msg.'));
            observer.eventHandler(event);

            let expectedOutput = `Failed to install package 'Faked package description': Faked error msg.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`DownloadStarted`, () => {
        observer.downloadProgressDot = 1;
        let event = new DownloadStarted('Faked package description');
        observer.eventHandler(event);

        let expectedOutput = `Downloading package '${event.pkgDescription}' `;
        assert.equal(loggerText, expectedOutput);
        assert.equal(observer.downloadProgressDot, 0);
    });

    it(`DownloadSizeObtained`, () => {
        let event = new DownloadSizeObtained(1025);
        observer.eventHandler(event);

        let expectedOutput = `(2 KB)`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('DownloadProgress', () => {
        it('100%', () => {
            let event = new DownloadProgress(100);
            observer.eventHandler(event);

            let expectedOutput = ` Done!\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('5%', () => {
            observer.downloadProgressDot = 0;
            let event = new DownloadProgress(5);
            observer.eventHandler(event);

            let expectedOutput = `.`;
            assert.equal(loggerText, expectedOutput);
            assert.equal(observer.downloadProgressDot, 1);
        });

        it('6%', () => {
            observer.downloadProgressDot = 0;
            let event = new DownloadProgress(6);
            observer.eventHandler(event);

            let expectedOutput = `..`;
            assert.equal(loggerText, expectedOutput);
            assert.equal(observer.downloadProgressDot, 2);
        });
    });

    it(`DownloadValidating`, () => {
        let event = new DownloadValidating();
        observer.eventHandler(event);

        let expectedOutput = `Validating download...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`ZipFileInstalling`, () => {
        let event = new ZipFileInstalling();
        observer.eventHandler(event);

        let expectedOutput = `Installing zip file...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`PlatformInfoRetrieved`, () => {
        let event = new PlatformInfoRetrieved(new PlatformInformation('faked-platform', 'faked-arch', 'faked-rid'));
        observer.eventHandler(event);

        let expectedOutput = `Platform: faked-platform, faked-arch\n\n`;
        assert.equal(loggerText, expectedOutput);
    });
});