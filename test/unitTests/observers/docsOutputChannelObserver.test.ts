import assert from 'assert';
import { OutputChannel } from 'vscode';
import { BaseEvent, DependencyInstallStarted, BuildInstantAllocated, UserSignInTriggered } from '../../../src/common/loggingEvents';
import { DocsOutputChannelObserver } from '../../../src/observers/docsOutputChannelObserver';

describe('DocsOutputChannelObserver', () => {
    let showCalled: boolean;

    beforeEach(() => {
        showCalled = false;
    });

    const outputChannel = <OutputChannel>{
        show: () => { showCalled = true; }
    };

    const observer = new DocsOutputChannelObserver(outputChannel);

    [
        new BuildInstantAllocated(),
        new UserSignInTriggered('FakedCorrelationId'),
        new DependencyInstallStarted('FakedCorrelationId')
    ].forEach((event: BaseEvent) => {
        it(`${event.constructor.name}: Channel is shown and focused `, () => {
            observer.eventHandler(event);
            assert.equal(showCalled, true);
        });
    });
});