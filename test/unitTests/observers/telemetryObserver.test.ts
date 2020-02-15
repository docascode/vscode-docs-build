import { expect } from 'chai';
import { UserSignInTriggered, UserSignInSucceeded, UserSignInFailed, } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';
import { Credential } from '../../../src/credential/credentialController';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';

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
        expect(sentEventMeasurements).to.be.undefined;
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
            expect(sentEventMeasurements).to.be.undefined;
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
            expect(sentEventMeasurements).to.be.undefined;
        });
    });
});