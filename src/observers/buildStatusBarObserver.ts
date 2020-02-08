import { BaseStatusBarObserver } from "./baseStatusBarObserver";
import { EventType } from "../common/eventType";
import { BaseEvent } from "../common/loggingEvents";

export class BuildStatusBarObserver extends BaseStatusBarObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.BuildInstantAllocated:
                this.setAndShowStatusBar(`$(sync~spin)`, undefined, undefined, 'Building the current workspace folder');
                break;
            case EventType.BuildInstantReleased:
                this.setAndShowStatusBar(`$(sync)`, undefined, undefined, 'Ready to Build');
                break;
        }
    }
}