import { expect } from 'chai';
import { UserSignInTriggered, UserSignInSucceeded, UserSignInFailed, UserSignOutTriggered, UserSignOutSucceeded, UserSignOutFailed, } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';
import { Credential } from '../../../src/credential/credentialController';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';

describe('TelemetryObserver', () => {
    let observer: TelemetryObserver;

    let sentEventName: string;
    let sentEventProperties: any;

    let telemetryReporter = <TelemetryReporter>{
        sendTelemetryEvent(eventName: string, properties?: {
            [key: string]: string;
        }, measurements?: {
            [key: string]: number;
        }): void {
            sentEventName = eventName;
            sentEventProperties = properties;
        }
    };

    before(() => {
        observer = new TelemetryObserver(telemetryReporter);
    });

    beforeEach(() => {
        sentEventName = undefined;
        sentEventProperties = undefined;
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
});