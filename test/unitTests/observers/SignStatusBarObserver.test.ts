import { expect } from 'chai';
import { SignStatusBarObserver } from '../../../src/observers/SignStatusBarObserver';
import { StatusBarItem } from 'vscode';
import { createSandbox } from 'sinon';
import { CredentialInitializing, UserSigningIn, UserSignedIn, FetchFromLocalCredentialManager, UserSignedOut, ResetCredential } from '../../../src/common/loggingEvents';
import { Credential } from '../../../src/credential/CredentialController';
import { EnvironmentController } from '../../../src/common/EnvironmentController';
import { MocPPEEnv } from '../../utils/faker';

describe('SignStatusBarObserver', () => {
    let showCalled: boolean;
    let environmentController = new EnvironmentController(undefined);

    beforeEach(() => {
        statusBarItem.text = undefined;
        statusBarItem.command = undefined;
        statusBarItem.tooltip = undefined;
        showCalled = false;
    });

    let statusBarItem = <StatusBarItem>{
        show: () => { showCalled = true; }
    };

    let observer = new SignStatusBarObserver(statusBarItem, environmentController);

    it(`Initialization: Status bar is shown with 'Initializing' text`, () => {
        let event = new CredentialInitializing();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Initializing`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`User Sigining in: Status bar is shown with 'Signing In' text`, () => {
        let event = new UserSigningIn();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Signing In`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`User Signed In: Status bar is shown with user info`, () => {
        let event = new UserSignedIn(<Credential>{
            signInStatus: 'SignedIn',
            aadInfo: 'fake-add',
            userInfo: {
                signType: 'GitHub',
                userEmail: 'fake@microsoft.com',
                userName: 'Fake User',
                userToken: 'fake-token'
            },
        });
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: $(mark-github) Fake User(fake@microsoft.com)`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`Fetch From Local Credential Manager: Status bar is shown with user info`, () => {
        let event = new FetchFromLocalCredentialManager(<Credential>{
            signInStatus: 'SignedIn',
            aadInfo: 'fake-add',
            userInfo: {
                signType: 'GitHub',
                userEmail: 'fake@microsoft.com',
                userName: 'Fake User',
                userToken: 'fake-token'
            },
        });
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: $(mark-github) Fake User(fake@microsoft.com)`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`User Sign Out: Status bar is shown with 'Sign in to Docs' text`, () => {
        let event = new UserSignedOut();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Sign in to Docs`);
        expect(statusBarItem.command).to.equal('docs.signIn');
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`Reset User Info: Status bar is shown with 'Sign in to Docs' text`, () => {
        let event = new ResetCredential();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Sign in to Docs`);
        expect(statusBarItem.command).to.equal('docs.signIn');
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`PPE Environment: Status bar is shown with 'Docs(Sandbox):'`, () => {
        // Moc PPE environment
        let sinon = createSandbox();
        MocPPEEnv(sinon, environmentController);

        // Test
        let event = new CredentialInitializing();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs(Sandbox): Initializing`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;

        // Reset Moc
        sinon.restore();
    });
});