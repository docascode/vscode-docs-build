import vscode from 'vscode';
import assert from 'assert';
import { CredentialExpired, CredentialReset, EnvironmentChanged, BaseEvent, CredentialRetrievedFromLocalCredentialManager, UserSignInProgress, UserSignInSucceeded, UserSignInFailed, UserSignInTriggered, UserSignOutSucceeded, UserSignOutTriggered } from '../../../src/common/loggingEvents';
import { EventStream } from '../../../src/common/eventStream';
import { CredentialController, Credential } from '../../../src/credential/credentialController';
import { KeyChain } from '../../../src/credential/keyChain';
import { EnvironmentController } from '../../../src/common/environmentController';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import TestEventBus from '../../utils/testEventBus';
import { UserInfo, uriHandler } from '../../../src/shared';
import { getFakeEnvironmentController } from '../../utils/faker';
import extensionConfig from '../../../src/config';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { TimeOutError } from '../../../src/error/timeOutError';

const fakedGitHubCallbackURL = <vscode.Uri>{
    authority: 'ceapex.docs-build',
    path: '/github-authenticate',
    query: 'name=Fake-User&email=fake@microsoft.com&X-OP-BuildUserToken=fake-token'
};

describe('CredentialController', () => {
    let sinon: SinonSandbox;
    let stubGetAADInfo: SinonStub;
    let stubGetUserInfo: SinonStub;
    let stubCredentialControllerInitialize: SinonStub;
    let stubOpenExternal: SinonStub;
    let stubConfigTimeout: SinonStub;

    let eventStream: EventStream;
    let environmentController: EnvironmentController;
    let keyChain: KeyChain;
    let credentialController: CredentialController;
    let testEventBus: TestEventBus;

    let setUserInfo: UserInfo;
    let isSetUserInfoCalled: boolean;
    let isResetUserInfoCalled: boolean;
    let isCredentialControllerInitializeCalled: boolean;

    before(() => {
        eventStream = new EventStream();
        environmentController = getFakeEnvironmentController();
        keyChain = new KeyChain(environmentController);
        credentialController = new CredentialController(keyChain, eventStream, environmentController);
        testEventBus = new TestEventBus(eventStream);

        sinon = createSandbox();
        sinon.stub(keyChain, 'setUserInfo').callsFake(function (userInfo: UserInfo): Promise<void> {
            isSetUserInfoCalled = true;
            setUserInfo = userInfo;
            return;
        });
        sinon.stub(keyChain, 'resetUserInfo').callsFake(function (): Promise<void> {
            isResetUserInfoCalled = true;
            return;
        });
    });

    beforeEach(() => {
        isSetUserInfoCalled = false;
        isResetUserInfoCalled = false;
        setUserInfo = undefined;
        testEventBus.clear();
    });

    afterEach(() => {
        stubGetAADInfo && stubGetAADInfo.restore();
        stubGetUserInfo && stubGetUserInfo.restore();
        stubConfigTimeout && stubConfigTimeout.restore();
        stubOpenExternal && stubOpenExternal.restore();
        stubCredentialControllerInitialize && stubCredentialControllerInitialize.restore();
    });

    after(() => {
        sinon.restore();
    });

    function mockFakeKeyChainInfo() {
        stubGetUserInfo = sinon.stub(keyChain, 'getUserInfo').resolves(<UserInfo>{
            signType: 'GitHub',
            userEmail: 'fake@microsoft.com',
            userName: 'Fake-User',
            userToken: 'fake-token'
        });
    }

    function mockUndefinedKeyChainInfo() {
        stubGetUserInfo = sinon.stub(keyChain, 'getUserInfo').resolves(undefined);
    }

    function AssertCredentialReset(credential: Credential) {
        assert.equal(isResetUserInfoCalled, true);
        assert.deepStrictEqual(credential, <Credential>{
            signInStatus: 'SignedOut',
            userInfo: undefined
        });
    }

    [
        new EnvironmentChanged('PPE')
    ].forEach((event: BaseEvent) => {
        describe(`Observer[${event.constructor.name}]: Credential should be refreshed`, () => {
            beforeEach(() => {
                stubCredentialControllerInitialize = sinon.stub(credentialController, 'initialize').callsFake(function (): Promise<void> {
                    isCredentialControllerInitializeCalled = true;
                    return;
                });

                isCredentialControllerInitializeCalled = false;
            });

            it(`CredentialController Initialize should be Called`, () => {
                credentialController.eventHandler(event);

                assert.equal(isCredentialControllerInitializeCalled, true);
            });
        });
    });

    it('CredentialExpired: Credential should be reset', () => {
        let event = new CredentialExpired();
        credentialController.eventHandler(event);

        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialReset()]);
    });

    describe(`Initialize`, () => {
        it(`Should be 'SignedIn' status if the user info can be retrieved from keyChain`, async () => {
            // Prepare
            mockFakeKeyChainInfo();

            // Act
            await credentialController.initialize();

            // Assert
            let credential = credentialController.credential;
            let expectedCredential = <Credential>{
                signInStatus: 'SignedIn',
                userInfo: {
                    signType: 'GitHub',
                    userEmail: 'fake@microsoft.com',
                    userName: 'Fake-User',
                    userToken: 'fake-token'
                }
            };
            assert.deepStrictEqual(credential, expectedCredential);
            assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialRetrievedFromLocalCredentialManager(expectedCredential)]);
        });

        it(`Should be 'SignedOut' status if the user info can not be retrieved from keyChain`, async () => {
            // Prepare
            mockUndefinedKeyChainInfo();

            // Act
            await credentialController.initialize();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialReset()]);
        });
    });

    describe(`User Sign-in`, () => {
        it(`Sign-in successfully`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            uriHandler.handleUri(fakedGitHubCallbackURL);
                        }, 10);
                        resolve(true);
                    });
                }
            );

            // act
            await credentialController.signIn('fakedCorrelationId');

            // Assert
            let credential = credentialController.credential;
            let expectedUserInfo = <UserInfo>{
                signType: 'GitHub',
                userEmail: 'fake@microsoft.com',
                userName: 'Fake-User',
                userToken: 'fake-token'
            };
            let expectedCredential = <Credential>{
                signInStatus: 'SignedIn',
                userInfo: expectedUserInfo
            };
            assert.deepStrictEqual(credential, expectedCredential);
            assert.equal(isSetUserInfoCalled, true);
            assert.deepStrictEqual(setUserInfo, expectedUserInfo);
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new CredentialReset(),
                new UserSignInTriggered('fakedCorrelationId'),
                new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'),
                new UserSignInSucceeded('fakedCorrelationId', expectedCredential)
            ]);
        });

        it(`Sign-in with GitHub failed`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').resolves(false);

            // Act
            await credentialController.signIn('fakedCorrelationId');

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new CredentialReset(),
                new UserSignInTriggered('fakedCorrelationId'),
                new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'),
                new CredentialReset(),
                new UserSignInFailed('fakedCorrelationId', new DocsError(`Sign-in with GitHub Failed: Please Allow to open external URL to Sign-In`, ErrorCode.GitHubSignInExternalUrlDeclined)),
            ]);
        });

        it(`Sign-in with GitHub time out`, async () => {
            // Prepare
            // Mock sign-in timeout config to 200ms.
            stubConfigTimeout = sinon.stub(extensionConfig, 'SignInTimeOut').get(() => {
                return 200;
            });
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').resolves(true);

            // Act
            await credentialController.signIn('fakedCorrelationId');

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new CredentialReset(),
                new UserSignInTriggered('fakedCorrelationId'),
                new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'),
                new CredentialReset(),
                new UserSignInFailed('fakedCorrelationId', new DocsError(`Sign-in with GitHub Failed: Time out`, ErrorCode.GitHubSignInTimeOut, new TimeOutError('Time out'))),
            ]);
        });
    });

    it(`User sign-out`, async () => {
        // Sign-in first
        mockFakeKeyChainInfo();
        credentialController.initialize();

        // Act - Sign-out
        credentialController.signOut('fakedCorrelationId');

        // Assert
        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new UserSignOutTriggered('fakedCorrelationId'),
            new CredentialReset(),
            new UserSignOutSucceeded('fakedCorrelationId')
        ]);
    });
});