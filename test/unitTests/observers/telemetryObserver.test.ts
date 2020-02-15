import { expect } from 'chai';
import { UserSignOutTriggered, UserSignOutSucceeded, UserSignOutFailed } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';

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

    it(`UserSignOutTriggered: 'SignOut.Triggered' event should be sent`, () => {
        let event = new UserSignOutTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('SignOut.Triggered');
        expect(sentEventProperties).to.deep.equal({
            correlationId: 'fakedCorrelationId'
        });
        expect(sentEventMeasurements).to.be.undefined;
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
            expect(sentEventMeasurements).to.be.undefined;
        });

        it('UserSignOutFailed', () => {
            let event = new UserSignOutFailed('fakedCorrelationId', new Error('Faked error message'));
            observer.eventHandler(event);
            expect(sentEventName).to.equal('SignOut.Completed');
            expect(sentEventProperties).to.deep.equal({
                correlationId: 'fakedCorrelationId',
                result: 'Failed',
            });
            expect(sentEventMeasurements).to.be.undefined;
        });
    });
});