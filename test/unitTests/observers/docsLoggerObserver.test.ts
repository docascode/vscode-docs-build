import assert from 'assert';

import { BuildType } from '../../../src/build/buildInput';
import { DocfxExecutionResult } from '../../../src/build/buildResult';
import { ILogger } from '../../../src/common/logger';
import { APICallFailed, APICallStarted, BuildCanceled, BuildFailed, BuildProgress, BuildStarted, BuildSucceeded, BuildTriggered, CancelBuildFailed, DependencyInstallCompleted, DependencyInstallStarted, DocfxBuildCompleted, DocfxRestoreCompleted, DownloadProgress, DownloadSizeObtained, DownloadStarted, DownloadValidating, ExtensionActivated, PackageInstallAttemptFailed, PackageInstallCompleted, PackageInstallStarted, PlatformInfoRetrieved, PublicContributorSignIn, RepositoryInfoRetrieved, StartLanguageServerCompleted, TriggerCommandWithUnknownUserType, UserSignInFailed, UserSignInProgress, UserSignInSucceeded, UserSignOutFailed, UserSignOutSucceeded, ZipFileInstalling } from '../../../src/common/loggingEvents';
import { PlatformInformation } from '../../../src/common/platformInformation';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { DocsLoggerObserver } from '../../../src/observers/docsLoggerObserver';
import { UserType } from '../../../src/shared';
import { fakedCredential, fakedPackage } from '../../utils/faker';

describe('DocsLoggerObserver', () => {
    let loggerText: string;
    let observer: DocsLoggerObserver;

    const logger = <ILogger>{
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
            const event = new UserSignInSucceeded('FakedCorrelationId', fakedCredential);
            observer.eventHandler(event);

            const expectedOutput = `Successfully signed in to Docs:\n`
                + `    - Platform: GitHub\n`
                + `    - Account: Faked User\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('UserSignInFailed', () => {
            const event = new UserSignInFailed('FakedCorrelationId', new Error('Faked error msg'));
            observer.eventHandler(event);

            const expectedOutput = `Failed to sign in to Docs: Faked error msg\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`CredentialRetrieveFromLocalCredentialManager`, () => {
            const event = new UserSignInSucceeded('fakedCorrelationId', fakedCredential, true);
            observer.eventHandler(event);

            const expectedOutput = `Successfully retrieved user credential from local credential manager:\n`
                + `    - Platform: GitHub\n`
                + `    - Account: Faked User\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('UserSignOutCompleted', () => {
        it(`UserSignOutSucceeded`, () => {
            const event = new UserSignOutSucceeded('FakedCorrelationId');
            observer.eventHandler(event);

            const expectedOutput = `Successfully signed out from Docs.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`UserSignOutFailed`, () => {
            const event = new UserSignOutFailed('FakedCorrelationId', new Error('Faked error msg'));
            observer.eventHandler(event);

            const expectedOutput = `Failed to sign out from Docs: Faked error msg\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`UserSignInProgress`, () => {
        const event = new UserSignInProgress(`Faked process msg`, 'Faked Tag');
        observer.eventHandler(event);

        const expectedOutput = `[Faked Tag] Faked process msg\n`;
        assert.equal(loggerText, expectedOutput);
    });

    // Build
    describe(`RepositoryInfoRetrieved`, () => {
        it(`Same original repository url with local repository url`, () => {
            const event = new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.repository');
            observer.eventHandler(event);

            const expectedOutput = `Repository information of current workspace folder:\n`
                + `  Local repository URL: https://faked.repository\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Different original repository url with local repository url`, () => {
            const event = new RepositoryInfoRetrieved('https://faked.local.repository', 'https://faked.original.repository');
            observer.eventHandler(event);

            const expectedOutput = `Repository information of current workspace folder:\n`
                + `  Local repository URL: https://faked.local.repository(original: https://faked.original.repository)\n`
                + `\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`BuildInstantAllocated`, () => {
        const event = new BuildTriggered('FakedCorrelationId', true);
        observer.eventHandler(event);

        const expectedOutput = `\n---------------------------\n`
            + `Preparing build context...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`BuildStarted`, () => {
        const event = new BuildStarted('FakedWorkspaceFolderName');
        observer.eventHandler(event);

        const expectedOutput = `Start to build workspace folder 'FakedWorkspaceFolderName'...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('BuildCompleted', () => {
        it('BuildSucceeded', () => {
            const event = new BuildSucceeded('FakedCorrelationId', undefined, BuildType.FullBuild, 10, undefined);
            observer.eventHandler(event);

            const expectedOutput = `Report generated, please view them in 'PROBLEMS' tab\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('BuildCanceled', () => {
            const event = new BuildCanceled('FakedCorrelationId', undefined, BuildType.FullBuild, 10);
            observer.eventHandler(event);

            const expectedOutput = `Build has been canceled\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('BuildFailed', () => {
            const event = new BuildFailed('FakedCorrelationId', undefined, BuildType.FullBuild, 10, new Error('Faked error msg'));
            observer.eventHandler(event);

            const expectedOutput = `Build failed: Faked error msg\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`BuildProgress`, () => {
        const event = new BuildProgress('faked msg');
        observer.eventHandler(event);

        const expectedOutput = `faked msg\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('DocfxRestoreCompleted', () => {
        it(`Docfx Restore succeeded`, () => {
            const event = new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Succeeded);
            observer.eventHandler(event);

            const expectedOutput = `Restore finished, start to run 'docfx build'...\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Restore failed`, () => {
            const event = new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Failed, 1);
            observer.eventHandler(event);

            const expectedOutput = `Error: running 'docfx restore' failed with exit code: 1\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Restore canceled`, () => {
            const event = new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Canceled);
            observer.eventHandler(event);

            const expectedOutput = `'docfx restore' command has been canceled, skip running 'docfx build'\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('DocfxBuildFinished', () => {
        it(`Docfx Build succeeded`, () => {
            const event = new DocfxBuildCompleted(DocfxExecutionResult.Succeeded);
            observer.eventHandler(event);

            const expectedOutput = `Build finished, generating report...\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Build failed`, () => {
            const event = new DocfxBuildCompleted(DocfxExecutionResult.Failed, 1);
            observer.eventHandler(event);

            const expectedOutput = `Error: running 'docfx build' failed with exit code: 1\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Docfx Build canceled`, () => {
            const event = new DocfxBuildCompleted(DocfxExecutionResult.Canceled);
            observer.eventHandler(event);

            const expectedOutput = `'docfx build' command has been canceled\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`Cancel Build failed`, () => {
        const event = new CancelBuildFailed('fakedcorrelationId', new Error('Faked error message'));
        observer.eventHandler(event);

        const expectedOutput = `Failed to cancel the current validation: Faked error message\n\n`;
        assert.equal(loggerText, expectedOutput);
    });

    // API
    it(`APICallStarted`, () => {
        const event = new APICallStarted('FakedAPIName', 'https://faked.api');
        observer.eventHandler(event);

        const expectedOutput = `[OPBuildAPIClient.FakedAPIName] Calling API 'https://faked.api'...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`APICallFailed`, () => {
        const event = new APICallFailed('FakedAPIName', 'https://faked.api', 'Faked msg');
        observer.eventHandler(event);

        const expectedOutput = `[OPBuildAPIClient.FakedAPIName] Call of API 'https://faked.api' failed: Faked msg\n`;
        assert.equal(loggerText, expectedOutput);
    });

    // Runtime Dependency
    it(`DependencyInstallStarted`, () => {
        const event = new DependencyInstallStarted('fakedCorrelationId');
        observer.eventHandler(event);

        const expectedOutput = `Installing run-time dependencies...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('DependencyInstallCompleted', () => {
        it(`Succeeded`, () => {
            const event = new DependencyInstallCompleted('fakedCorrelationId', true, 10);
            observer.eventHandler(event);

            const expectedOutput = `Run-time dependencies installation finished.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Failed`, () => {
            const event = new DependencyInstallCompleted('fakedCorrelationId', false, 10);
            observer.eventHandler(event);

            const expectedOutput = `Installation of run-time dependencies failed and some features may not work as expected. Please restart Visual Studio Code to re-trigger the installation.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`PackageInstallStarted`, () => {
        const event = new PackageInstallStarted('Faked package description');
        observer.eventHandler(event);

        const expectedOutput = `Installing package 'Faked package description'...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('PackageInstallCompleted', () => {
        it(`Succeeded`, () => {
            const event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, true, 0, 10);
            observer.eventHandler(event);

            const expectedOutput = `Package 'Faked package description' installed!\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Failed`, () => {
            const event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, false, 3, 10);
            observer.eventHandler(event);

            const expectedOutput = `Package 'Faked package description' installation failed after 3 times attempt!\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('PackageInstallAttemptFailed', () => {
        it(`Will Retry`, () => {
            const event = new PackageInstallAttemptFailed('FakedCorrelationId', fakedPackage, 1, new Error('Faked error msg.'));
            observer.eventHandler(event);

            const expectedOutput = `Failed to install package 'Faked package description': Faked error msg. Retrying...\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Will not Retry`, () => {
            const event = new PackageInstallAttemptFailed('FakedCorrelationId', fakedPackage, 3, new Error('Faked error msg.'));
            observer.eventHandler(event);

            const expectedOutput = `Failed to install package 'Faked package description': Faked error msg.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    it(`DownloadStarted`, () => {
        observer.downloadProgressDot = 1;
        const event = new DownloadStarted('Faked package description');
        observer.eventHandler(event);

        const expectedOutput = `Downloading package '${event.pkgDescription}' `;
        assert.equal(loggerText, expectedOutput);
        assert.equal(observer.downloadProgressDot, 0);
    });

    it(`DownloadSizeObtained`, () => {
        const event = new DownloadSizeObtained(1025);
        observer.eventHandler(event);

        const expectedOutput = `(2 KB)`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('DownloadProgress', () => {
        it('100%', () => {
            const event = new DownloadProgress(100);
            observer.eventHandler(event);

            const expectedOutput = ` Done!\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it('5%', () => {
            observer.downloadProgressDot = 0;
            const event = new DownloadProgress(5);
            observer.eventHandler(event);

            const expectedOutput = `.`;
            assert.equal(loggerText, expectedOutput);
            assert.equal(observer.downloadProgressDot, 1);
        });

        it('6%', () => {
            observer.downloadProgressDot = 0;
            const event = new DownloadProgress(6);
            observer.eventHandler(event);

            const expectedOutput = `..`;
            assert.equal(loggerText, expectedOutput);
            assert.equal(observer.downloadProgressDot, 2);
        });
    });

    it(`DownloadValidating`, () => {
        const event = new DownloadValidating();
        observer.eventHandler(event);

        const expectedOutput = `Validating download...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`ZipFileInstalling`, () => {
        const event = new ZipFileInstalling();
        observer.eventHandler(event);

        const expectedOutput = `Installing zip file...\n`;
        assert.equal(loggerText, expectedOutput);
    });

    it(`PlatformInfoRetrieved`, () => {
        const event = new PlatformInfoRetrieved(new PlatformInformation('faked-platform', 'faked-arch', 'faked-rid'));
        observer.eventHandler(event);

        const expectedOutput = `Platform: faked-platform, faked-arch\n\n`;
        assert.equal(loggerText, expectedOutput);
    });

    describe('Extension Activated', () => {
        it(`Extension Activated`, () => {
            const event = new ExtensionActivated(UserType.MicrosoftEmployee, 'fakeSessionId');
            observer.eventHandler(event);

            const expectedOutput = `Extension activated.\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('Command triggered with unknown user type', () => {
        it(`Command triggered with unknown user type`, () => {
            const event = new TriggerCommandWithUnknownUserType();
            observer.eventHandler(event);

            const expectedOutput = `Command triggered when user type is unknown.\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('Public contributor sign in', () => {
        it(`Public contributor sign in`, () => {
            const event = new PublicContributorSignIn();
            observer.eventHandler(event);

            const expectedOutput = `Sign in failed: Sign in is only available for Microsoft employees.\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });

    describe('Handle Start language server completed', () => {
        it(`Handle Start language server succeeds`, () => {
            const event = new StartLanguageServerCompleted(true);
            observer.eventHandler(event);

            const expectedOutput = `Successfully start language server.\n\n`;
            assert.equal(loggerText, expectedOutput);
        });

        it(`Handle Start language server fails`, () => {
            const event = new StartLanguageServerCompleted(false, new DocsError('fakeError', ErrorCode.TriggerBuildBeforeSignIn));
            observer.eventHandler(event);

            const expectedOutput = `Failed to start language server: fakeError\n\n`;
            assert.equal(loggerText, expectedOutput);
        });
    });
});