import { BaseEvent } from '../common/loggingEvents';
import TelemetryReporter from 'vscode-extension-telemetry';

export class TelemetryObserver {
    constructor(private reporter: TelemetryReporter) {
        console.log(this.reporter);
    }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
        }
    }
}