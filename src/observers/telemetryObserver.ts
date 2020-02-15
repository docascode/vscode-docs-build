import { BaseEvent, UserSignOutTriggered, UserSignOutCompleted } from '../common/loggingEvents';
import TelemetryReporter from 'vscode-extension-telemetry';
import { EventType } from '../common/eventType';

export class TelemetryObserver {
    constructor(private reporter: TelemetryReporter) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.UserSignOutTriggered:
                this.handleUserSignOutTriggered(<UserSignOutTriggered>event);
                break;
            case EventType.UserSignOutCompleted:
                this.handleUserSignOutCompleted(<UserSignOutCompleted>event);
                break;
        }
    }

    // Sign
    private handleUserSignOutTriggered(event: UserSignOutTriggered) {
        this.reporter.sendTelemetryEvent(
            'SignOut.Triggered',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleUserSignOutCompleted(event: UserSignOutCompleted) {
        this.reporter.sendTelemetryEvent(
            'SignOut.Completed',
            {
                correlationId: event.correlationId,
                result: event.succeeded ? 'Succeeded' : 'Failed',
            }
        );
    }
}