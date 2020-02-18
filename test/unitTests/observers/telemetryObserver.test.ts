import { expect } from 'chai';
import { QuickPickTriggered, QuickPickCommandSelected } from '../../../src/common/loggingEvents';
import { TelemetryObserver } from '../../../src/observers/telemetryObserver';
import TelemetryReporter from 'vscode-extension-telemetry';

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

    it(`QuickPickTriggered: 'QuickPick.Triggered' event should be sent`, () => {
        let event = new QuickPickTriggered('fakedCorrelationId');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('QuickPick.Triggered');
        expect(sentEventProperties).to.deep.equal({
            correlationId: 'fakedCorrelationId'
        });
    });

    it(`QuickPickCommandSelected: 'QuickPick.CommandSelected' event should be sent`, () => {
        let event = new QuickPickCommandSelected('fakedCorrelationId', 'fakedCommand');
        observer.eventHandler(event);
        expect(sentEventName).to.equal('QuickPick.CommandSelected');
        expect(sentEventProperties).to.deep.equal({
            correlationId: 'fakedCorrelationId',
            command: 'fakedCommand'
        });
    });
});