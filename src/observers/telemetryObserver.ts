import { BaseEvent, LearnMoreClicked } from '../common/loggingEvents';
import TelemetryReporter from 'vscode-extension-telemetry';
import { EventType } from '../common/eventType';

export class TelemetryObserver {
    constructor(private reporter: TelemetryReporter) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.LearnMoreClicked:
                this.handleLearnMoreClicked(<LearnMoreClicked>event);
                break;
        }
    }

    private handleLearnMoreClicked(event: LearnMoreClicked) {
        let errorCode = event.code;
        this.reporter.sendTelemetryEvent(
            'LearnMore.Clicked',
            {
                correlationId: event.correlationId,
                errorCode
            }
        );
    }
}