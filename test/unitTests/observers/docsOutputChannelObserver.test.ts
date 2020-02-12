import { expect } from 'chai';
import { OutputChannel } from 'vscode';
import { UserSignInTriggered, BaseEvent, DependencyInstallStarted, BuildInstantAllocated } from '../../../src/common/loggingEvents';
import { DocsOutputChannelObserver } from '../../../src/observers/docsOutputChannelObserver';

describe('DocsOutputChannelObserver', () => {
    let showCalled: boolean;

    beforeEach(() => {
        showCalled = false;
    });

    let outputChannel = <OutputChannel>{
        show: () => { showCalled = true; }
    };

    let observer = new DocsOutputChannelObserver(outputChannel);

    [
        new UserSignInTriggered('FakedCorrelationId'),
        new BuildInstantAllocated(),
        new DependencyInstallStarted()
    ].forEach((event: BaseEvent) => {
        it(`${event.constructor.name}: Channel is shown and focused `, () => {
            observer.eventHandler(event);
            expect(showCalled).to.be.true;
        });
    });
});