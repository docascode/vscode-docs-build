import { BaseEvent } from '../common/loggingEvents';
import { OutputChannel } from 'vscode';
import { EventType } from '../common/eventType';

export class DocsOutputChannelObserver {
    constructor(private channel: OutputChannel) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.BuildInstantAllocated:
            case EventType.UserSignInTriggered:
            case EventType.DependencyInstallStarted:
                this.channel.show();
                break;
        }
    }
}