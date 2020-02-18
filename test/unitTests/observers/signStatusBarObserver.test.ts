import { expect } from 'chai';
import { SignStatusBarObserver } from '../../../src/observers/signStatusBarObserver';
import { StatusBarItem } from 'vscode';
import { CredentialInitializing, UserSignInSucceeded, CredentialRetrieveFromLocalCredentialManager, UserSignedOut, CredentialReset, UserSignInTriggered } from '../../../src/common/loggingEvents';
import { Credential } from '../../../src/credential/credentialController';
import { getFakeEnvironmentController, setEnvToPPE } from '../../utils/faker';
import { EnvironmentController } from '../../../src/common/environmentController';

describe('SignStatusBarObserver', () => {
    let showCalled: boolean;
    let environmentController: EnvironmentController;
    let observer: SignStatusBarObserver;

    let statusBarItem = <StatusBarItem>{
        show: () => { showCalled = true; }
    };

    before(() => {
        environmentController = getFakeEnvironmentController();
        observer = new SignStatusBarObserver(statusBarItem, environmentController);
    });

    beforeEach(() => {
        statusBarItem.text = undefined;
        statusBarItem.command = undefined;
        statusBarItem.tooltip = undefined;
        showCalled = false;
    });

    it(`Initialization: Status bar is shown with 'Initializing' text`, () => {
        let event = new CredentialInitializing();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Initializing`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`User Signing in: Status bar is shown with 'Signing In' text`, () => {
        let event = new UserSignInTriggered('FakedCorrelationId');
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Signing-in`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`User Signed In: Status bar is shown with user info`, () => {
        let event = new UserSignInSucceeded('FakedCorrelationId', <Credential>{
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
        expect(statusBarItem.command).to.equal('docs.validationQuickPick');
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`Fetch From Local Credential Manager: Status bar is shown with user info`, () => {
        let event = new CredentialRetrieveFromLocalCredentialManager(<Credential>{
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
        expect(statusBarItem.command).to.equal('docs.validationQuickPick');
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`User Sign-out: Status bar is shown with 'Sign-in to Docs' text`, () => {
        let event = new UserSignedOut();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Sign-in to Docs`);
        expect(statusBarItem.command).to.equal('docs.signIn');
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`Reset User Info: Status bar is shown with 'Sign-in to Docs' text`, () => {
        let event = new CredentialReset();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs: Sign-in to Docs`);
        expect(statusBarItem.command).to.equal('docs.signIn');
        expect(statusBarItem.tooltip).to.be.undefined;
    });

    it(`PPE Environment: Status bar is shown with 'Docs(Sandbox):'`, () => {
        // Mock PPE environment
        setEnvToPPE(environmentController);

        // Test
        let event = new CredentialInitializing();
        observer.eventHandler(event);
        expect(showCalled).to.be.true;
        expect(statusBarItem.text).to.equal(`Docs(Sandbox): Initializing`);
        expect(statusBarItem.command).to.be.undefined;
        expect(statusBarItem.tooltip).to.be.undefined;
    });
});