import { expect } from 'chai';
import { BuildTriggered, BuildSucceeded, BuildFailed, BuildCanceled } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';
import { DocsError } from '../../../src/errors/DocsError';
import { ErrorCode } from '../../../src/errors/ErrorCode';
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

    it(`BuildTriggered: 'Build.Triggered' event should be sent`, () => {
        let event = new BuildTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('Build.Triggered');
        expect(sentEventProperties).to.deep.equal({
            correlationId: 'fakedCorrelationId'
        });
        expect(sentEventMeasurements).to.be.undefined;
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
});