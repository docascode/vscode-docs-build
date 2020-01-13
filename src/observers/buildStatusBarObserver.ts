import { BaseStatusBarItemObserver } from "./BaseStatusBarObserver";
import { EventType } from "../common/EventType";
import { BaseEvent } from "../common/loggingEvents";

export class BuildStatusBarObserver extends BaseStatusBarItemObserver {
    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.BuildInstantAllocated:
                this.SetAndShowStatusBar(`$(sync~spin)`, undefined, undefined, 'Building the current workspace folder');
                break;
            case EventType.BuildInstantReleased:
                this.SetAndShowStatusBar(`$(sync)`, undefined, undefined, 'Ready to Build');
                break;
        }
    }
}