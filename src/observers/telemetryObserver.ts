import { BaseEvent, QuickPickTriggered, QuickPickCommandSelected } from '../common/loggingEvents';
import TelemetryReporter from 'vscode-extension-telemetry';
import { EventType } from '../common/eventType';

export class TelemetryObserver {
    constructor(private reporter: TelemetryReporter) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.QuickPickTriggered:
                this.handleQuickPickTriggered(<QuickPickTriggered>event);
                break;
            case EventType.QuickPickCommandSelected:
                this.handleQuickPickCommandSelected(<QuickPickCommandSelected>event);
                break;
        }
    }

    private handleQuickPickTriggered(event: QuickPickTriggered) {
        this.reporter.sendTelemetryEvent(
            'QuickPick.Triggered',
            {
                correlationId: event.correlationId
            }
        );
    }

    private handleQuickPickCommandSelected(event: QuickPickCommandSelected) {
        this.reporter.sendTelemetryEvent(
            'QuickPick.CommandSelected',
            {
                correlationId: event.correlationId,
                command: event.command
            }
        );
    }
}