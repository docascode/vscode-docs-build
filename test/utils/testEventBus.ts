import { Subscription } from 'rxjs';

import { EventStream } from '../../src/common/eventStream';
import { BaseEvent } from '../../src/common/loggingEvents';

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

    public dispose(): void {
        this.subscription.unsubscribe();
    }
}