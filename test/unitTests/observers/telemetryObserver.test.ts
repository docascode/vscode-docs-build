import assert from 'assert';
import { UserSignInTriggered, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutSucceeded, UserSignOutFailed, BuildCanceled, BuildFailed, BuildTriggered, BuildSucceeded, LearnMoreClicked, QuickPickTriggered, QuickPickCommandSelected, } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';
import { Credential } from '../../../src/credential/credentialController';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { BuildInput } from '../../../src/build/buildInput';
import { BuildResult } from '../../../src/build/buildResult';

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
            correlationId: 'fakedCorrelationId'
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
                correlationId: 'fakedCorrelationId',
                result: 'Succeeded',
                signInType: "GitHub",
                userName: 'Faked User',
                userEmail: 'fake@microsoft.com',
                errorCode: undefined,
            });
        });

        it('UserSignInFailed', () => {
            let event = new UserSignInFailed('fakedCorrelationId', new DocsError('Faked error message', ErrorCode.AADSignInFailed));
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignIn.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                correlationId: 'fakedCorrelationId',
                result: 'Failed',
                signInType: undefined,
                userName: undefined,
                userEmail: undefined,
                errorCode: 'AADSignInFailed',
            });
        });
    });

    it(`UserSignOutTriggered: 'SignOut.Triggered' event should be sent`, () => {
        let event = new UserSignOutTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'SignOut.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            correlationId: 'fakedCorrelationId'
        });
    });

    describe(`UserSignOutCompleted: 'SignOut.Completed' event should be sent`, () => {
        it('UserSignOutSucceeded', () => {
            let event = new UserSignOutSucceeded('fakedCorrelationId');
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignOut.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                correlationId: 'fakedCorrelationId',
                result: 'Succeeded',
            });
        });

        it('UserSignOutFailed', () => {
            let event = new UserSignOutFailed('fakedCorrelationId', new Error('Faked error message'));
            observer.eventHandler(event);
            assert.equal(sentEventName, 'SignOut.Completed');
            assert.deepStrictEqual(sentEventProperties, {
                correlationId: 'fakedCorrelationId',
                result: 'Failed',
            });
        });
    });

    it(`BuildTriggered: 'Build.Triggered' event should be sent`, () => {
        let event = new BuildTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'Build.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            correlationId: 'fakedCorrelationId'
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
                correlationId: 'FakedCorrelationId',
                result: 'Succeeded',
                errorCode: undefined,
                isRestoreSkipped: 'false',
                buildType: 'FullBuild',
                localRepositoryUrl: 'https://faked.local-repository.com',
                originalRepositoryUrl: 'https://faked.original-repository.com',
                localRepositoryBranch: 'master'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                totalTimeInSeconds: 10,
                restoreTimeInSeconds: 4,
                buildTimeInSeconds: 5
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
                correlationId: 'FakedCorrelationId',
                result: 'Failed',
                errorCode: 'GenerateReportFailed',
                isRestoreSkipped: 'false',
                buildType: 'FullBuild',
                localRepositoryUrl: 'https://faked.local-repository.com',
                originalRepositoryUrl: 'https://faked.original-repository.com',
                localRepositoryBranch: 'master'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                totalTimeInSeconds: 10,
                restoreTimeInSeconds: undefined,
                buildTimeInSeconds: undefined
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
                correlationId: 'FakedCorrelationId',
                result: 'Canceled',
                errorCode: undefined,
                isRestoreSkipped: 'false',
                buildType: 'FullBuild',
                localRepositoryUrl: 'https://faked.local-repository.com',
                originalRepositoryUrl: 'https://faked.original-repository.com',
                localRepositoryBranch: 'master'
            });
            assert.deepStrictEqual(sentEventMeasurements, {
                totalTimeInSeconds: 10,
                restoreTimeInSeconds: undefined,
                buildTimeInSeconds: undefined
            });
        });
    });

    it(`QuickPickTriggered: 'QuickPick.Triggered' event should be sent`, () => {
        let event = new QuickPickTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'QuickPick.Triggered');
        assert.deepStrictEqual(sentEventProperties, {
            correlationId: 'fakedCorrelationId'
        });
    });

    it(`QuickPickCommandSelected: 'QuickPick.CommandSelected' event should be sent`, () => {
        let event = new QuickPickCommandSelected('fakedCorrelationId', 'fakedCommand');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'QuickPick.CommandSelected');
        assert.deepStrictEqual(sentEventProperties, {
            correlationId: 'fakedCorrelationId',
            command: 'fakedCommand'
        });
    });

    it(`LearnMoreClick: 'LearnMore.Click' event should be sent`, () => {
        let event = new LearnMoreClicked('fakedCorrelationId', 'fakedErrorCode');
        observer.eventHandler(event);
        assert.equal(sentEventName, 'LearnMore.Clicked');
        assert.deepStrictEqual(sentEventProperties, {
            correlationId: 'fakedCorrelationId',
            errorCode: 'fakedErrorCode'
        });
    });
});