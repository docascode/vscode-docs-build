import assert from 'assert';
import { UserSignInTriggered, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutSucceeded, UserSignOutFailed, BuildCanceled, BuildFailed, BuildTriggered, BuildSucceeded, LearnMoreClicked, QuickPickTriggered, QuickPickCommandSelected, DependencyInstallStarted, DependencyInstallCompleted, PackageInstallCompleted, BuildCacheSizeCalculated, } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';
import { Credential } from '../../../src/credential/credentialController';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { BuildInput } from '../../../src/build/buildInput';
import { BuildResult } from '../../../src/build/buildResult';
import { fakedPackage } from '../../utils/faker';

describe('TelemetryObserver', () => {
    let observer: TelemetryObserver;

    let sentEventName: string;
    let sentEventProperties: any;
    let sentEventMeasurements: any;

    let telemetryReporter = <TelemetryReporter>{
        sendTelemetryEvent(eventName: string, properties?: {
            [key: string]: string;
        }, measurements?: {
            [key: string]: number;
        }): void {
            sentEventName = eventName;
            sentEventProperties = properties;
            sentEventMeasurements = measurements;
        }
    };

    before(() => {
        observer = new TelemetryObserver(telemetryReporter);
    });

    beforeEach(() => {
        sentEventName = undefined;
        sentEventProperties = undefined;
        sentEventMeasurements = undefined;
    });

    // Sign
    it(`UserSignInTriggered: 'SignIn.Triggered' event should be sent`, () => {
        let event = new UserSignInTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'SignIn.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`UserSignInCompleted: 'SignIn.Completed' event should be sent`, () => {
        it('UserSignInSucceeded', () => {
            let event = new UserSignInSucceeded('fakedCorrelationId', <Credential>{
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
            assert.equal(sentEventName, 'SignIn.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded',
                SignInType: "GitHub",
                UserName: 'Faked User',
                UserEmail: 'fake@microsoft.com',
                ErrorCode: undefined,
            });
        });

        it('UserSignInFailed', () => {
            let event = new UserSignInFailed('fakedCorrelationId', new DocsError('Faked error message', ErrorCode.AADSignInFailed));
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignIn.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Failed',
                SignInType: undefined,
                UserName: undefined,
                UserEmail: undefined,
                ErrorCode: 'AADSignInFailed',
            });
        });
    });

    it(`UserSignOutTriggered: 'SignOut.Triggered' event should be sent`, () => {
        let event = new UserSignOutTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'SignOut.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`UserSignOutCompleted: 'SignOut.Completed' event should be sent`, () => {
        it('UserSignOutSucceeded', () => {
            let event = new UserSignOutSucceeded('fakedCorrelationId');
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignOut.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded',
            });
        });

        it('UserSignOutFailed', () => {
            let event = new UserSignOutFailed('fakedCorrelationId', new Error('Faked error message'));
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignOut.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Failed',
            });
        });
    });

    it(`BuildTriggered: 'Build.Triggered' event should be sent`, () => {
        let event = new BuildTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'Build.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`BuildCompleted: 'Build.Completed' event should be sent`, () => {
        it('BuildSucceeded', () => {
            let event = new BuildSucceeded(
                'FakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: '/fakedPath/',
                    localRepositoryUrl: 'https://faked.local-repository.com',
                    originalRepositoryUrl: 'https://faked.original-repository.com',
                    localRepositoryBranch: 'master'
                },
                10,
                <BuildResult>{
                    result: 'Succeeded',
                    isRestoreSkipped: false,
                    restoreTimeInSeconds: 4,
                    buildTimeInSeconds: 5
                });
            observer.eventHandler(event);

            assert.equal(sentEventName, 'Build.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'FakedCorrelationId',
                Result: 'Succeeded',
                ErrorCode: undefined,
                IsRestoreSkipped: 'false',
                BuildType: 'FullBuild',
                LocalRepositoryUrl: 'https://faked.local-repository.com',
                OriginalRepositoryUrl: 'https://faked.original-repository.com',
                LocalRepositoryBranch: 'master'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                TotalTimeInSeconds: 10,
                RestoreTimeInSeconds: 4,
                BuildTimeInSeconds: 5
            });
        });

        it('BuildCacheCalculated', () => {
            let event = new BuildCacheSizeCalculated(
                'FakedCorrelationId',
                20);
            observer.eventHandler(event);

            assert.equal(sentEventName, 'BuildCacheSize');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'FakedCorrelationId',
                });
            assert.deepEqual(sentEventMeasurements, {
                SizeInMB: 20,
            });
        });

        it('BuildFailed', () => {
            let event = new BuildFailed(
                'FakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: '/fakedPath/',
                    localRepositoryUrl: 'https://faked.local-repository.com',
                    originalRepositoryUrl: 'https://faked.original-repository.com',
                    localRepositoryBranch: 'master'
                },
                10,
                new DocsError('Faked error msg', ErrorCode.GenerateReportFailed));
            observer.eventHandler(event);

            assert.equal(sentEventName, 'Build.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'FakedCorrelationId',
                Result: 'Failed',
                ErrorCode: 'GenerateReportFailed',
                IsRestoreSkipped: 'false',
                BuildType: 'FullBuild',
                LocalRepositoryUrl: 'https://faked.local-repository.com',
                OriginalRepositoryUrl: 'https://faked.original-repository.com',
                LocalRepositoryBranch: 'master'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                TotalTimeInSeconds: 10,
                RestoreTimeInSeconds: undefined,
                BuildTimeInSeconds: undefined
            });
        });

        it('BuildCanceled', () => {
            let event = new BuildCanceled(
                'FakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: '/fakedPath/',
                    localRepositoryUrl: 'https://faked.local-repository.com',
                    originalRepositoryUrl: 'https://faked.original-repository.com',
                    localRepositoryBranch: 'master'
                },
                10);
            observer.eventHandler(event);

            assert.equal(sentEventName, 'Build.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'FakedCorrelationId',
                Result: 'Canceled',
                ErrorCode: undefined,
                IsRestoreSkipped: 'false',
                BuildType: 'FullBuild',
                LocalRepositoryUrl: 'https://faked.local-repository.com',
                OriginalRepositoryUrl: 'https://faked.original-repository.com',
                LocalRepositoryBranch: 'master'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                TotalTimeInSeconds: 10,
                RestoreTimeInSeconds: undefined,
                BuildTimeInSeconds: undefined
            });
        });
    });

    it(`DependencyInstallStarted: 'InstallDependency.Started' event should be sent`, () => {
        let event = new DependencyInstallStarted('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'InstallDependency.Started');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`DependencyInstallCompleted: 'InstallDependency.Completed' event should be sent`, () => {
        it(`Succeeded`, () => {
            let event = new DependencyInstallCompleted('fakedCorrelationId', true, 10);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'InstallDependency.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                ElapsedTimeInSeconds: 10
            });
        });

        it(`Failed`, () => {
            let event = new DependencyInstallCompleted('fakedCorrelationId', false, 10);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'InstallDependency.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Failed'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                ElapsedTimeInSeconds: 10
            });
        });
    });

    describe(`PackageInstallCompleted: 'InstallDependency.Package.Completed' event should be sent`, () => {
        it(`Succeeded`, () => {
            let event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, true, 1, 10);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'InstallDependency.Package.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded',
                PackageId: 'faked-id'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                RetryCount: 1,
                ElapsedTimeInSeconds: 10
            });
        });

        it(`Failed`, () => {
            let event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, false, 2, 10);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'InstallDependency.Package.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Failed',
                PackageId: 'faked-id'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                RetryCount: 2,
                ElapsedTimeInSeconds: 10
            });
        });
    });

    it(`QuickPickTriggered: 'QuickPick.Triggered' event should be sent`, () => {
        let event = new QuickPickTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'QuickPick.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    it(`QuickPickCommandSelected: 'QuickPick.CommandSelected' event should be sent`, () => {
        let event = new QuickPickCommandSelected('fakedCorrelationId', 'fakedCommand');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'QuickPick.CommandSelected');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId',
            Command: 'fakedCommand'
        });
    });

    it(`LearnMoreClick: 'LearnMore.Click' event should be sent`, () => {
        let event = new LearnMoreClicked('fakedCorrelationId', 'fakedErrorCode');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'LearnMore.Clicked');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId',
            ErrorCode: 'fakedErrorCode'
        });
    });
});