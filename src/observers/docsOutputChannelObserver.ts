import { OutputChannel } from 'vscode';

import { DocfxExecutionResult } from '../build/buildResult';
import { EventType } from '../common/eventType';
import { BaseEvent, BuildCompleted } from '../common/loggingEvents';

export class DocsOutputChannelObserver {
    constructor(private _channel: OutputChannel) { }

    public eventHandler = (event: BaseEvent): void => {
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