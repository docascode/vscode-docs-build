import assert from 'assert';
import { StatusBarItem } from 'vscode';

import { BuildInstantAllocated, BuildInstantReleased } from '../../../src/common/loggingEvents';
import { BuildStatusBarObserver } from '../../../src/observers/buildStatusBarObserver';

describe('BuildStatusBarObserver', () => {
    let showCalled: boolean;
    let observer: BuildStatusBarObserver;

    const statusBarItem = <StatusBarItem>{
        show: () => { showCalled = true; }
    };

    before(() => {
        observer = new BuildStatusBarObserver(statusBarItem);
    });

    beforeEach(() => {
        statusBarItem.text = undefined;
        statusBarItem.command = undefined;
        statusBarItem.tooltip = undefined;
        showCalled = false;
    });

    it(`BuildInstantAllocated: Status bar is shown with '$(sync~spin)' text`, () => {
        const event = new BuildInstantAllocated();
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(sync~spin)`);
        assert.equal(statusBarItem.command, undefined);
        assert.equal(statusBarItem.tooltip, 'Validating the current workspace folder');
    });

    it(`BuildInstantReleased: Status bar is shown with '$(sync)' text`, () => {
        const event = new BuildInstantReleased();
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(sync)`);
        assert.equal(statusBarItem.command, undefined);
        assert.equal(statusBarItem.tooltip, 'Ready to validate');
    });
});