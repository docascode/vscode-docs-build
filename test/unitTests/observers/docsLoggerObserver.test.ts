import { expect } from 'chai';
import { OutputChannel } from 'vscode';
import { UserSignInSucceeded, CredentialRetrieveFromLocalCredentialManager, UserSignInProgress, RepositoryInfoRetrieved, BuildInstantAllocated, BuildTriggerFailed, BuildJobTriggered, ReportGenerationFailed, DocfxRestoreSucceeded, DocfxRestoreFailed, DocfxRestoreCanceled, DocfxBuildCanceled, DocfxBuildSucceeded, DocfxBuildFailed, BuildJobSucceeded, BuildProgress, APICallStarted, APICallFailed, DependencyInstallStarted, DependencyInstallFinished, PackageInstallStarted, PackageInstallSucceeded, PackageInstallFailed, DownloadStarted, DownloadSizeObtained, DownloadProgress, DownloadValidating, DownloadIntegrityCheckFailed, ZipFileInstalling, PlatformInfoRetrieved, UserSignInFailed, UserSignOutSucceeded, UserSignOutFailed } from '../../../src/common/loggingEvents';
import { DocsLoggerObserver } from '../../../src/observers/docsLoggerObserver';
import { Credential } from '../../../src/credential/credentialController';
import { TriggerErrorType } from '../../../src/build/triggerErrorType';
import { PlatformInformation } from '../../../src/common/platformInformation';

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
            let event = new UserSignInSucceeded('FakedCorrelationId', <Credential>{
                signInStatus: 'SignedIn',
                aadInfo: 'faked-aad',
                userInfo: {
                    signType: 'GitHub',
                    userEmail: 'fake@microsoft.com',
                    userName: 'Faked User',
                    userToken: 'faked-token'
                }
            });
            observer.eventHandler(event);

            let expectedOutput = `Successfully sign-in to Docs Build:\n`
                + `    - GitHub Account: Faked User\n`
                + `    - User email    : fake@microsoft.com\n`
                + `\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it('UserSignInFailed', () => {
            let event = new UserSignInFailed('FakedCorrelationId', new Error('Faked error msg'));
            observer.eventHandler(event);

            let expectedOutput = `Failed to sign-in to Docs Build: Faked error msg\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });
    });

    it(`CredentialRetrieveFromLocalCredentialManager`, () => {
        let event = new CredentialRetrieveFromLocalCredentialManager(<Credential>{
            signInStatus: 'SignedIn',
            aadInfo: 'faked-aad',
            userInfo: {
                signType: 'GitHub',
                userEmail: 'fake@microsoft.com',
                userName: 'Faked User',
                userToken: 'faked-token'
            }
        });
        observer.eventHandler(event);

        let expectedOutput = `Successfully retrieved user credential from Local Credential Manager:\n`
            + `    - GitHub Account: Faked User\n`
            + `    - User email    : fake@microsoft.com\n`
            + `\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    describe('UserSignOutCompleted', () => {
        it(`UserSignOutSucceeded`, () => {
            let event = new UserSignOutSucceeded('FakedCorrelationId');
            observer.eventHandler(event);

            let expectedOutput = `Successfully sign-out from Docs Build!\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it(`UserSignOutFailed`, () => {
            let event = new UserSignOutFailed('FakedCorrelationId', new Error('Faked error msg'));
            observer.eventHandler(event);

            let expectedOutput = `Failed to sign-out from Docs Build: Faked error msg\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });
    });

    it(`UserSignInProgress`, () => {
        let event = new UserSignInProgress(`Faked process msg`, 'Faked Tag');
        observer.eventHandler(event);

        let expectedOutput = `[Faked Tag] Faked process msg\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    describe(`RepositoryInfoRetrieved`, () => {
        it(`Same original repository url with local repository url`, () => {
            let event = new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.repository');
            observer.eventHandler(event);

            let expectedOutput = `Repository Information of current workspace folder:\n`
                + `  Local Repository URL: https://faked.repository\n`
                + `\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it(`Different original repository url with local repository url`, () => {
            let event = new RepositoryInfoRetrieved('https://faked.local.repository', 'https://faked.original.repository');
            observer.eventHandler(event);

            let expectedOutput = `Repository Information of current workspace folder:\n`
                + `  Local Repository URL: https://faked.local.repository(original: https://faked.original.repository)\n`
                + `\n`;
            expect(loggerText).to.equal(expectedOutput);
        });
    });

    it(`BuildInstantAllocated`, () => {
        let event = new BuildInstantAllocated();
        observer.eventHandler(event);

        let expectedOutput = `\n---------------------------\n`
            + `Preparing build context...\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`BuildTriggerFailed`, () => {
        let event = new BuildTriggerFailed('Faked msg', TriggerErrorType.TriggerBuildBeforeSignedIn);
        observer.eventHandler(event);

        let expectedOutput = `Cannot trigger build: Faked msg\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`BuildJobTriggered`, () => {
        let event = new BuildJobTriggered('FakedWorkspaceFolderName');
        observer.eventHandler(event);

        let expectedOutput = `Start to build workspace folder 'FakedWorkspaceFolderName'\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`ReportGenerationFailed`, () => {
        let event = new ReportGenerationFailed('Faked msg');
        observer.eventHandler(event);

        let expectedOutput = `Error happened when visualizing the build report: 'Faked msg'\n\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    describe('DocfxRestoreFinished', () => {
        it(`Restore succeeded`, () => {
            let event = new DocfxRestoreSucceeded();
            observer.eventHandler(event);

            let expectedOutput = `Restore Finished, start to run 'docfx build'...\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it(`Restore failed`, () => {
            let event = new DocfxRestoreFailed(1);
            observer.eventHandler(event);

            let expectedOutput = `Error: Running 'docfx restore' failed with exit code: 1\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });
    });

    it(`DocfxRestoreCanceled`, () => {
        let event = new DocfxRestoreCanceled();
        observer.eventHandler(event);

        let expectedOutput = `'docfx restore' command has been canceled, skip running 'docfx build'\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`DocfxBuildCanceled`, () => {
        let event = new DocfxBuildCanceled();
        observer.eventHandler(event);

        let expectedOutput = `'docfx build' command has been canceled\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    describe('DocfxBuildFinished', () => {
        it(`Build succeeded`, () => {
            let event = new DocfxBuildSucceeded();
            observer.eventHandler(event);

            let expectedOutput = `Build Finished, Generating report...\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it(`Build failed`, () => {
            let event = new DocfxBuildFailed(1);
            observer.eventHandler(event);

            let expectedOutput = `Error: Running 'docfx build' failed with exit code: 1\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });
    });

    it(`BuildJobSucceeded`, () => {
        let event = new BuildJobSucceeded();
        observer.eventHandler(event);

        let expectedOutput = `Report generated, please view them in 'PROBLEMS' tab\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`BuildProgress`, () => {
        let event = new BuildProgress('faked msg');
        observer.eventHandler(event);

        let expectedOutput = `faked msg\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`APICallStarted`, () => {
        let event = new APICallStarted('FakedAPIName', 'https://faked.api');
        observer.eventHandler(event);

        let expectedOutput = `[OPBuildAPIClient.FakedAPIName] Calling API 'https://faked.api'...\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`APICallFailed`, () => {
        let event = new APICallFailed('FakedAPIName', 'https://faked.api', 'Faked msg');
        observer.eventHandler(event);

        let expectedOutput = `[OPBuildAPIClient.FakedAPIName] Call API 'https://faked.api' failed: Faked msg\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`DependencyInstallStarted`, () => {
        let event = new DependencyInstallStarted();
        observer.eventHandler(event);

        let expectedOutput = `Installing runtime dependencies...\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`DependencyInstallFinished`, () => {
        let event = new DependencyInstallFinished();
        observer.eventHandler(event);

        let expectedOutput = `Runtime dependencies installation finished!\n\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`PackageInstallStarted`, () => {
        let event = new PackageInstallStarted('Faked package description');
        observer.eventHandler(event);

        let expectedOutput = `Installing package 'Faked package description'...\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`PackageInstallSucceeded`, () => {
        let event = new PackageInstallSucceeded('Faked package description');
        observer.eventHandler(event);

        let expectedOutput = `Package 'Faked package description' installed!\n\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    describe('PackageInstallFailed', () => {
        it(`Will Retry`, () => {
            let event = new PackageInstallFailed('Faked package description', 'Faked error msg', true);
            observer.eventHandler(event);

            let expectedOutput = `Failed to install package 'Faked package description': Faked error msg. Retrying..\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it(`Will not Retry`, () => {
            let event = new PackageInstallFailed('Faked package description', 'Faked error msg', false);
            observer.eventHandler(event);

            let expectedOutput = `Failed to install package 'Faked package description': Faked error msg. Some features may not work as expected. Please restart Visual Studio Code to re-trigger the download.\n\n`;
            expect(loggerText).to.equal(expectedOutput);
        });
    });

    it(`DownloadStarted`, () => {
        observer.downloadProgressDotValue = 1;
        let event = new DownloadStarted('Faked package description');
        observer.eventHandler(event);

        let expectedOutput = `Downloading package '${event.pkgDescription}' `;
        expect(loggerText).to.equal(expectedOutput);
        expect(observer.downloadProgressDotValue).to.equal(0);
    });

    it(`DownloadSizeObtained`, () => {
        let event = new DownloadSizeObtained(1025);
        observer.eventHandler(event);

        let expectedOutput = `(2 KB)`;
        expect(loggerText).to.equal(expectedOutput);
    });

    describe('DownloadProgress', () => {
        it('100%', () => {
            let event = new DownloadProgress(100);
            observer.eventHandler(event);

            let expectedOutput = ` Done!\n`;
            expect(loggerText).to.equal(expectedOutput);
        });

        it('5%', () => {
            observer.downloadProgressDotValue = 0;
            let event = new DownloadProgress(5);
            observer.eventHandler(event);

            let expectedOutput = `.`;
            expect(loggerText).to.equal(expectedOutput);
            expect(observer.downloadProgressDotValue).to.equal(1);
        });

        it('6%', () => {
            observer.downloadProgressDotValue = 0;
            let event = new DownloadProgress(6);
            observer.eventHandler(event);

            let expectedOutput = `..`;
            expect(loggerText).to.equal(expectedOutput);
            expect(observer.downloadProgressDotValue).to.equal(2);
        });
    });

    it(`DownloadValidating`, () => {
        let event = new DownloadValidating();
        observer.eventHandler(event);

        let expectedOutput = `Validating download...\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`DownloadIntegrityCheckFailed`, () => {
        let event = new DownloadIntegrityCheckFailed();
        observer.eventHandler(event);

        let expectedOutput = `Package download failed integrity check.\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`ZipFileInstalling`, () => {
        let event = new ZipFileInstalling();
        observer.eventHandler(event);

        let expectedOutput = `Installing zip file...\n`;
        expect(loggerText).to.equal(expectedOutput);
    });

    it(`PlatformInfoRetrieved`, () => {
        let event = new PlatformInfoRetrieved(new PlatformInformation('faked-platform', 'faked-arch', 'faked-rid'));
        observer.eventHandler(event);

        let expectedOutput = `Platform: faked-platform, faked-arch\n\n`;
        expect(loggerText).to.equal(expectedOutput);
    });
});