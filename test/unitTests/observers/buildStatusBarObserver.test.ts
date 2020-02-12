import { expect } from 'chai';
import { StatusBarItem } from 'vscode';
import { BuildStatusBarObserver } from '../../../src/observers/buildStatusBarObserver';
import { BuildInstantAllocated, BuildInstantReleased } from '../../../src/common/loggingEvents';

describe('BuildStatusBarObserver', () => {
    let showCalled: boolean;
    let observer: BuildStatusBarObserver;

    let statusBarItem = <StatusBarItem>{
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
        let event = new BuildInstantAllocated();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`$(sync~spin)`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.equal('Building the current workspace folder');
    });

    it(`BuildInstantReleased: Status bar is shown with '$(sync)' text`, () => {
        let event = new BuildInstantReleased();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`$(sync)`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.equal('Ready to Build');
    });
});