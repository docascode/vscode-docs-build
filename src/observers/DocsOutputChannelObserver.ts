import { BaseEvent } from "../common/loggingEvents";
import { OutputChannel } from "vscode";
import { EventType } from "../common/EventType";

export class DocsOutputChannelObserver {
    constructor(private channel: OutputChannel) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.DependencyInstallStart:
                this.channel.show();
                break;
        }
    }
}