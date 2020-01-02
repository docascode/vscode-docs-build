import { Subject, Subscription } from 'rxjs';
import { BaseEvent } from "./loggingEvents";

export class EventStream {
    private sink: Subject<BaseEvent>;

    constructor() {
        this.sink = new Subject<BaseEvent>();
    }

    public post(event: BaseEvent) {
        this.sink.next(event);
    }

    public subscribe(eventHandler: (event: BaseEvent) => void): Subscription {
        return this.sink.subscribe(eventHandler);
    }
}