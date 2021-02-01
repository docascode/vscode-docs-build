import assert from 'assert';

import { BuildInput } from '../../../src/build/buildInput';
import { BuildResult } from '../../../src/build/buildResult';
import { BuildCanceled, BuildFailed, BuildSucceeded, BuildTriggered, CancelBuildFailed, CancelBuildSucceeded, CancelBuildTriggered, DependencyInstallCompleted, DependencyInstallStarted, ExtensionActivated, LearnMoreClicked, PackageInstallAttemptFailed, PackageInstallCompleted, QuickPickCommandSelected, QuickPickTriggered, UserSignInFailed, UserSignInSucceeded, UserSignInTriggered, UserSignOutFailed, UserSignOutSucceeded, UserSignOutTriggered, } from '../../../src/common/loggingEvents';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import { UserType } from '../../../src/shared';
import TelemetryReporter from '../../../src/telemetryReporter';
import { fakedCredential, fakedPackage } from '../../utils/faker';

describe('TelemetryObserver', () => {
    let observer: TelemetryObserver;

    let sentMetricName: string;
    let sentMetricValue: number;
    let sentMetricProperties: any;
    let sentEventName: string;
    let sentEventProperties: any;
    let sentEventMeasurements: any;

    const telemetryReporter = <TelemetryReporter>{
        sendTelemetryEvent(eventName: string, properties?: {
            [key: string]: string;
        }, measurements?: {
            [key: string]: number;
        }): void {
            sentEventName = eventName;
            sentEventProperties = properties;
            sentEventMeasurements = measurements;
        },
        sendTelemetryMetric(
            metricName: string,
            value: number,
            properties?: { [key: string]: string }
        ): void {
            sentMetricName = metricName;
            sentMetricProperties = properties;
            sentMetricValue = value;
        }
    };

    before(() => {
        observer = new TelemetryObserver(telemetryReporter);
    });

    beforeEach(() => {
        sentMetricName = undefined;
        sentMetricProperties = undefined;
        sentMetricValue = undefined;
        sentEventName = undefined;
        sentEventProperties = undefined;
        sentEventMeasurements = undefined;
    });

    // Sign
    it(`UserSignInTriggered: 'SignIn.Triggered' event should be sent`, () => {
        const event = new UserSignInTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'SignIn.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`UserSignInCompleted: 'SignIn.Completed' event should be sent`, () => {
        it('UserSignInSucceeded', () => {
            const event = new UserSignInSucceeded('fakedCorrelationId', fakedCredential);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignIn.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded',
                RetrievedFromCache: 'false',
                SignInType: "GitHub",
                ErrorCode: undefined,
            });
        });

        it('UserSignInFailed', () => {
            const event = new UserSignInFailed('fakedCorrelationId', new DocsError('Faked error message', ErrorCode.GitHubSignInFailed));
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignIn.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Failed',
                RetrievedFromCache: 'false',
                SignInType: undefined,
                ErrorCode: 'GitHubSignInFailed',
            });
        });

        it('CredentialRetrieveFromLocalCredentialManager', () => {
            const event = new UserSignInSucceeded('fakedCorrelationId', fakedCredential, true);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignIn.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded',
                RetrievedFromCache: 'true',
                SignInType: "GitHub",
                ErrorCode: undefined
            });
        });
    });

    it(`UserSignOutTriggered: 'SignOut.Triggered' event should be sent`, () => {
        const event = new UserSignOutTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'SignOut.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`UserSignOutCompleted: 'SignOut.Completed' event should be sent`, () => {
        it('UserSignOutSucceeded', () => {
            const event = new UserSignOutSucceeded('fakedCorrelationId');
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignOut.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Succeeded',
            });
        });

        it('UserSignOutFailed', () => {
            const event = new UserSignOutFailed('fakedCorrelationId', new Error('Faked error message'));
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignOut.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'fakedCorrelationId',
                Result: 'Failed',
            });
        });
    });

    it(`BuildTriggered: 'Build.Triggered' event should be sent`, () => {
        const event = new BuildTriggered('fakedCorrelationId', true);
        observer.eventHandler(event);
        assert.equal(sentEventName, 'Build.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`BuildCompleted: 'Build.Completed' event should be sent`, () => {
        it('BuildSucceeded', () => {
            const event = new BuildSucceeded(
                'FakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: '/fakedPath/',
                    localRepositoryUrl: 'https://faked.local-repository.com',
                    originalRepositoryUrl: 'https://faked.original-repository.com',
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
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                TotalTimeInSeconds: 10,
                RestoreTimeInSeconds: 4,
                BuildTimeInSeconds: 5
            });
        });

        it('BuildFailed', () => {
            const event = new BuildFailed(
                'FakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: '/fakedPath/',
                    localRepositoryUrl: 'https://faked.local-repository.com',
                    originalRepositoryUrl: 'https://faked.original-repository.com',
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
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                TotalTimeInSeconds: 10,
                RestoreTimeInSeconds: undefined,
                BuildTimeInSeconds: undefined
            });
        });

        it('BuildCanceled', () => {
            const event = new BuildCanceled(
                'FakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: '/fakedPath/',
                    localRepositoryUrl: 'https://faked.local-repository.com',
                    originalRepositoryUrl: 'https://faked.original-repository.com',
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
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                TotalTimeInSeconds: 10,
                RestoreTimeInSeconds: undefined,
                BuildTimeInSeconds: undefined
            });
        });
    });

    it('CancelBuildTriggered', () => {
        const event = new CancelBuildTriggered('FakedCorrelationId');
        observer.eventHandler(event);

        assert.equal(sentEventName, 'CancelBuild.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'FakedCorrelationId',
        });
    });

    describe('CancelBuildCompleted', () => {
        it('CancelBuildSucceeded', () => {
            const event = new CancelBuildSucceeded('FakedCorrelationId');
            observer.eventHandler(event);

            assert.equal(sentEventName, 'CancelBuild.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'FakedCorrelationId',
                Result: 'Succeeded'
            });
        });

        it('CancelBuildFailed', () => {
            const event = new CancelBuildFailed('FakedCorrelationId');
            observer.eventHandler(event);

            assert.equal(sentEventName, 'CancelBuild.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                CorrelationId: 'FakedCorrelationId',
                Result: 'Failed'
            });
        });
    });

    it(`DependencyInstallStarted: 'InstallDependency.Started' event should be sent`, () => {
        const event = new DependencyInstallStarted('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'InstallDependency.Started');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    describe(`DependencyInstallCompleted: 'InstallDependency.Completed' event should be sent`, () => {
        it(`Succeeded`, () => {
            const event = new DependencyInstallCompleted('fakedCorrelationId', true, 10);
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
            const event = new DependencyInstallCompleted('fakedCorrelationId', false, 10);
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
            const event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, true, 1, 10);
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
            const event = new PackageInstallCompleted('fakedCorrelationId', fakedPackage, false, 2, 10);
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

    it(`PackageInstallAttemptFailed: 'InstallDependency.Package.Error' metric should be sent`, () => {
        const event = new PackageInstallAttemptFailed('fakedCorrelationId', fakedPackage, 1, new DocsError('Faked error msg', ErrorCode.CheckIntegrityFailed));
        observer.eventHandler(event);
        assert.equal(sentMetricName, 'InstallDependency.Package.Error');
        assert.equal(sentMetricValue, 1);
        assert.deepStrictEqual(sentMetricProperties, {
            CorrelationId: 'fakedCorrelationId',
            PackageId: 'faked-id',
            ErrorCode: 'CheckIntegrityFailed'
        });
    });

    it(`QuickPickTriggered: 'QuickPick.Triggered' event should be sent`, () => {
        const event = new QuickPickTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'QuickPick.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId'
        });
    });

    it(`QuickPickCommandSelected: 'QuickPick.CommandSelected' event should be sent`, () => {
        const event = new QuickPickCommandSelected('fakedCorrelationId', 'fakedCommand');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'QuickPick.CommandSelected');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId',
            Command: 'fakedCommand'
        });
    });

    it(`LearnMoreClick: 'LearnMore.Click' event should be sent`, () => {
        const event = new LearnMoreClicked('fakedCorrelationId', 'fakedErrorCode');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'LearnMore.Clicked');
        assert.deepStrictEqual(sentEventProperties, {
            CorrelationId: 'fakedCorrelationId',
            ErrorCode: 'fakedErrorCode'
        });
    });

    describe(`Extension activated`, () => {
        it(`SessionInfo should be sent`, () => {
            const fakeSessionId = 'fakeSessionId';
            const event = new ExtensionActivated(UserType.MicrosoftEmployee, fakeSessionId);
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SessionInfo');
            assert.deepStrictEqual(sentEventProperties, {
                SessionId: fakeSessionId,
                UserRole: UserType.MicrosoftEmployee
            })
        });
    });
});