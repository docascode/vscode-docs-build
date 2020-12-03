import { BaseEvent, BuildCompleted } from '../common/loggingEvents';
import { OutputChannel } from 'vscode';
import { EventType } from '../common/eventType';
import { DocfxExecutionResult } from '../build/buildResult';

export class DocsOutputChannelObserver {
    constructor(private _channel: OutputChannel) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.BuildInstantAllocated:
            case EventType.UserSignInTriggered:
            case EventType.DependencyInstallStarted:
                this._channel.show();
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === DocfxExecutionResult.Failed) {
                    this._channel.show();
                }
                break;
        }
    }
}