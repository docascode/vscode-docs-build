import { expect } from 'chai';
import { UserSignInTriggered, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutSucceeded, UserSignOutFailed, BuildCanceled, BuildFailed, BuildTriggered, BuildSucceeded, LearnMoreClicked, } from '../../../src/common/loggingEvents';
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

    it(`UserSignInTriggered: 'SignIn.Triggered' event should be sent`, () => {
        let event = new UserSignInTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('SignIn.Triggered');
        expect(sentEventProperties).to.deep.equal({
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
            expect(sentEventName).to.equal('SignIn.Completed');
            expect(sentEventProperties).to.deep.equal({
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
            expect(sentEventName).to.equal('SignIn.Completed');
            expect(sentEventProperties).to.deep.equal({
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
        expect(sentEventName).to.equal('SignOut.Triggered');
        expect(sentEventProperties).to.deep.equal({
            correlationId: 'fakedCorrelationId'
        });
    });

    describe(`UserSignOutCompleted: 'SignOut.Completed' event should be sent`, () => {
        it('UserSignOutSucceeded', () => {
            let event = new UserSignOutSucceeded('fakedCorrelationId');
            observer.eventHandler(event);
            expect(sentEventName).to.equal('SignOut.Completed');
            expect(sentEventProperties).to.deep.equal({
                correlationId: 'fakedCorrelationId',
                result: 'Succeeded',
            });
        });

        it('UserSignOutFailed', () => {
            let event = new UserSignOutFailed('fakedCorrelationId', new Error('Faked error message'));
            observer.eventHandler(event);
            expect(sentEventName).to.equal('SignOut.Completed');
            expect(sentEventProperties).to.deep.equal({
                correlationId: 'fakedCorrelationId',
                result: 'Failed',
            });
        });
    });

    it(`BuildTriggered: 'Build.Triggered' event should be sent`, () => {
        let event = new BuildTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('Build.Triggered');
        expect(sentEventProperties).to.deep.equal({
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

            expect(sentEventName).to.equal('Build.Completed');
            expect(sentEventProperties).to.deep.equal({
                correlationId: 'FakedCorrelationId',
                result: 'Succeeded',
                errorCode: undefined,
                isRestoreSkipped: 'false',
                buildType: 'FullBuild',
                localRepositoryUrl: 'https://faked.local-repository.com',
                originalRepositoryUrl: 'https://faked.original-repository.com',
                localRepositoryBranch: 'master'
            });
            expect(sentEventMeasurements).to.deep.equal({
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

            expect(sentEventName).to.equal('Build.Completed');
            expect(sentEventProperties).to.deep.equal({
                correlationId: 'FakedCorrelationId',
                result: 'Failed',
                errorCode: 'GenerateReportFailed',
                isRestoreSkipped: 'false',
                buildType: 'FullBuild',
                localRepositoryUrl: 'https://faked.local-repository.com',
                originalRepositoryUrl: 'https://faked.original-repository.com',
                localRepositoryBranch: 'master'
            });
            expect(sentEventMeasurements).to.deep.equal({
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

            expect(sentEventName).to.equal('Build.Completed');
            expect(sentEventProperties).to.deep.equal({
                correlationId: 'FakedCorrelationId',
                result: 'Canceled',
                errorCode: undefined,
                isRestoreSkipped: 'false',
                buildType: 'FullBuild',
                localRepositoryUrl: 'https://faked.local-repository.com',
                originalRepositoryUrl: 'https://faked.original-repository.com',
                localRepositoryBranch: 'master'
            });
            expect(sentEventMeasurements).to.deep.equal({
                totalTimeInSeconds: 10,
                restoreTimeInSeconds: undefined,
                buildTimeInSeconds: undefined
            });
        });
    });

    it(`LearnMoreClick: 'LearnMore.Click' event should be sent`, () => {
        let event = new LearnMoreClicked('fakedCorrelationId', 'fakedErrorCode');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('LearnMore.Clicked');
        expect(sentEventProperties).to.deep.equal({
            correlationId: 'fakedCorrelationId',
            errorCode: 'fakedErrorCode'
        });
    });
});