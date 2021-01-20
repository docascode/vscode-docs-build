import assert from 'assert';
import { StatusBarItem } from 'vscode';

import { EnvironmentController } from '../../../src/common/environmentController';
import { CredentialInitializing, CredentialReset, UserSignInSucceeded, UserSignInTriggered } from '../../../src/common/loggingEvents';
import { DocsStatusBarObserver } from '../../../src/observers/docsStatusBarObserver';
import { fakedCredential,getFakeEnvironmentController, setEnvToPPE } from '../../utils/faker';

describe('DocsStatusBarObserver', () => {
    let showCalled: boolean;
    let environmentController: EnvironmentController;
    let observer: DocsStatusBarObserver;

    const statusBarItem = <StatusBarItem>{
        show: () => { showCalled = true; }
    };

    before(() => {
        environmentController = getFakeEnvironmentController();
        observer = new DocsStatusBarObserver(statusBarItem, environmentController);
    });

    beforeEach(() => {
        statusBarItem.text = undefined;
        statusBarItem.command = undefined;
        statusBarItem.tooltip = undefined;
        showCalled = false;
    });

    it(`Initialization: Status bar is shown with 'Initializing' text`, () => {
        const event = new CredentialInitializing();
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(play) Docs Validation: Initializing`);
        assert.equal(statusBarItem.command, undefined);
        assert.equal(statusBarItem.tooltip, 'Show quick pick(Alt + D)');
    });

    it(`User Signing in: Status bar is shown with 'Signing In' text`, () => {
        const event = new UserSignInTriggered('FakedCorrelationId');
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(play) Docs Validation: Signing in`);
        assert.equal(statusBarItem.command, 'docs.signOut');
        assert.equal(statusBarItem.tooltip, 'Show quick pick(Alt + D)');
    });

    it(`User Signed In: Status bar is shown with user info`, () => {
        const event = new UserSignInSucceeded('FakedCorrelationId', fakedCredential);
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(play) Docs Validation: $(mark-github) Faked User`);
        assert.equal(statusBarItem.command, 'docs.validationQuickPick');
        assert.equal(statusBarItem.tooltip, 'Show quick pick(Alt + D)');
    });

    it(`Reset User Info: Status bar is shown with 'Sign-in to Docs' text`, () => {
        const event = new CredentialReset();
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(play) Docs Validation`);
        assert.equal(statusBarItem.command, 'docs.validationQuickPick');
        assert.equal(statusBarItem.tooltip, 'Show quick pick(Alt + D)');
    });

    it(`PPE Environment: Status bar is shown with 'Docs (PPE):'`, () => {
        // Mock PPE environment
        setEnvToPPE(environmentController);

        // Test
        const event = new CredentialInitializing();
        observer.eventHandler(event);
        assert.equal(showCalled, true);
        assert.equal(statusBarItem.text, `$(play) Docs Validation(PPE): Initializing`);
        assert.equal(statusBarItem.command, undefined);
        assert.equal(statusBarItem.tooltip, 'Show quick pick(Alt + D)');
    });
});