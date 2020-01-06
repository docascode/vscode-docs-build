import { BaseEvent } from "../../src/common/loggingEvents";
import { EventStream } from "../../src/common/EventStream";
import { Subscription } from "rxjs";

export default class TestEventBus {
    private eventBus: Array<BaseEvent>;
    private subscription: Subscription;

    constructor(eventStream: EventStream) {
        this.eventBus = [];
        this.subscription = eventStream.subscribe(event => this.eventBus.push(event));
    }

    public getEvents(): Array<BaseEvent> {
        return this.eventBus;
    }

    public clear(): void {
        this.eventBus = [];
    }

    public dispose() {
        this.subscription.unsubscribe();
    }
}