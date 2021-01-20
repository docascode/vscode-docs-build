import { EventType } from "../common/eventType";
import { BaseEvent } from "../common/loggingEvents";
import { BaseStatusBarObserver } from "./baseStatusBarObserver";

export class BuildStatusBarObserver extends BaseStatusBarObserver {
    public eventHandler = (event: BaseEvent): void => {
        switch (event.type) {
            case EventType.BuildInstantAllocated:
                this.setAndShowStatusBar(`$(sync~spin)`, undefined, undefined, 'Validating the current workspace folder');
                break;
            case EventType.BuildInstantReleased:
                this.setAndShowStatusBar(`$(sync)`, undefined, undefined, 'Ready to validate');
                break;
        }
    }
}