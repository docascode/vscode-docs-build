import * as vscode from 'vscode';
import { CredentialExpired, CredentialReset, EnvironmentChanged, BaseEvent, CredentialRetrieveFromLocalCredentialManager, UserSignedOut, UserSignInProgress, UserSigningIn, UserSignInSucceeded, UserSignInFailed } from '../../src/common/loggingEvents';
import { EventStream } from '../../src/common/eventStream';
import { CredentialController, Credential } from '../../src/credential/credentialController';
import { KeyChain } from '../../src/credential/keyChain';
import { EnvironmentController } from '../../src/common/environmentController';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import { expect } from 'chai';
import TestEventBus from '../utils/testEventBus';
import { UserInfo, uriHandler } from '../../src/shared';
import { getFakeEnvironmentController } from '../utils/faker';
import extensionConfig from '../../src/config';

const fakedAADCallbackURL = <vscode.Uri>{
    authority: 'ceapex.docs-build',
    path: '/aad-authenticate',
};

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
    let setAADInfo: string;
    let isSetAADInfoCalled: boolean;
    let isSetUserInfoCalled: boolean;
    let isResetAADInfoCalled: boolean;
    let isResetUserInfoCalled: boolean;
    let isCredentialControllerInitializeCalled: boolean;

    before(() => {
        eventStream = new EventStream();
        environmentController = getFakeEnvironmentController();
        keyChain = new KeyChain(environmentController);
        credentialController = new CredentialController(keyChain, eventStream, environmentController);
        testEventBus = new TestEventBus(eventStream);

        sinon = createSandbox();
        sinon.stub(keyChain, 'setAADInfo').callsFake(function (aadInfo: string): Promise<void> {
            isSetAADInfoCalled = true;
            setAADInfo = aadInfo;
            return;
        });
        sinon.stub(keyChain, 'setUserInfo').callsFake(function (userInfo: UserInfo): Promise<void> {
            isSetUserInfoCalled = true;
            setUserInfo = userInfo;
            return;
        });
        sinon.stub(keyChain, 'resetAADInfo').callsFake(function (): Promise<void> {
            isResetAADInfoCalled = true;
            return;
        });
        sinon.stub(keyChain, 'resetUserInfo').callsFake(function (): Promise<void> {
            isResetUserInfoCalled = true;
            return;
        });
    });

    beforeEach(() => {
        isSetAADInfoCalled = false;
        isSetUserInfoCalled = false;
        isResetAADInfoCalled = false;
        isResetUserInfoCalled = false;
        setAADInfo = undefined;
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
        stubGetAADInfo = sinon.stub(keyChain, 'getAADInfo').resolves('fake-aad');
        stubGetUserInfo = sinon.stub(keyChain, 'getUserInfo').resolves(<UserInfo>{
            signType: 'GitHub',
            userEmail: 'fake@microsoft.com',
            userName: 'Fake-User',
            userToken: 'fake-token'
        });
    }

    function mockUndefinedKeyChainInfo() {
        stubGetAADInfo = sinon.stub(keyChain, 'getAADInfo').resolves(undefined);
        stubGetUserInfo = sinon.stub(keyChain, 'getUserInfo').resolves(undefined);
    }

    function AssertCredentialReset(credential: Credential) {
        expect(isResetAADInfoCalled).to.be.true;
        expect(isResetUserInfoCalled).to.be.true;
        expect(credential).to.deep.equal(<Credential>{
            signInStatus: 'SignedOut',
            aadInfo: undefined,
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

                expect(isCredentialControllerInitializeCalled).to.be.true;
            });
        });
    });

    it('CredentialExpired: Credential should be reset', () => {
        let event = new CredentialExpired();
        credentialController.eventHandler(event);

        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        expect(testEventBus.getEvents()).to.deep.equal([new CredentialReset()]);
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
                aadInfo: 'fake-aad',
                userInfo: {
                    signType: 'GitHub',
                    userEmail: 'fake@microsoft.com',
                    userName: 'Fake-User',
                    userToken: 'fake-token'
                }
            };
            expect(credential).to.deep.equal(expectedCredential);
            expect(testEventBus.getEvents()).to.deep.equal([new CredentialRetrieveFromLocalCredentialManager(expectedCredential)]);
        });

        it(`Should be 'SignedOut' status if the user info can not be retrieved from keyChain`, async () => {
            // Prepare
            mockUndefinedKeyChainInfo();

            // Act
            await credentialController.initialize();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([new CredentialReset()]);
        });
    });

    describe(`User Sign-in`, () => {
        it(`Sign-in successfully`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        if (target.authority === 'login.microsoftonline.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(fakedAADCallbackURL);
                            }, 10);
                        } else if (target.authority === 'github.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(fakedGitHubCallbackURL);
                            }, 10);
                        }

                        resolve(true);
                    });
                }
            );

            // act
            await credentialController.signIn();

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
                aadInfo: 'aad-code',
                userInfo: expectedUserInfo
            };
            expect(credential).to.deep.equal(expectedCredential);
            expect(isSetAADInfoCalled).to.be.true;
            expect(setAADInfo).to.equal('aad-code');
            expect(isSetUserInfoCalled).to.be.true;
            expect(setUserInfo).to.deep.equal(expectedUserInfo);
            expect(testEventBus.getEvents()).to.deep.equal([
                new CredentialReset(),
                new UserSigningIn(),
                new UserSignInProgress(`Sign-in to docs build with AAD...`, 'Sign-in'),
                new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'),
                new UserSignInSucceeded(expectedCredential)
            ]);
        });

        it(`Sign-in with AAD failed`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').resolves(false);

            // Act
            await credentialController.signIn();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([
                new CredentialReset(),
                new UserSigningIn(),
                new UserSignInProgress(`Sign-in to docs build with AAD...`, 'Sign-in'),
                new UserSignInFailed(`Sign-in with AAD Failed`),
                new CredentialReset()
            ]);
        });

        it(`Sign-in with GitHub failed`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        if (target.authority === 'login.microsoftonline.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(fakedAADCallbackURL);
                            }, 10);
                            resolve(true);
                        }
                        resolve(false);
                    });
                }
            );

            // Act
            await credentialController.signIn();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([
                new CredentialReset(),
                new UserSigningIn(),
                new UserSignInProgress(`Sign-in to docs build with AAD...`, 'Sign-in'),
                new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'),
                new UserSignInFailed(`Sign-in with GitHub Failed`),
                new CredentialReset()
            ]);
        });

        it(`Sign-in with AAD time out`, async () => {
            // Prepare
            // Mock sign-in timeout config to 200ms.
            stubConfigTimeout = sinon.stub(extensionConfig, 'SignInTimeOut').get(() => {
                return 200;
            });
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').resolves(true);

            // Act
            await credentialController.signIn();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([
                new CredentialReset(),
                new UserSigningIn(),
                new UserSignInProgress(`Sign-in to docs build with AAD...`, 'Sign-in'),
                new UserSignInFailed(`Sign-in with AAD Failed: Timeout`),
                new CredentialReset()
            ]);
        });

        it(`Sign-in with GitHub time out`, async () => {
            // Prepare
            // Overwrite sign-in timeout to 200ms.
            stubConfigTimeout = sinon.stub(extensionConfig, 'SignInTimeOut').get(() => {
                return 200;
            });
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        if (target.authority === 'login.microsoftonline.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(fakedAADCallbackURL);
                            }, 10);
                        }
                        resolve(true);
                    });
                }
            );

            // Act
            await credentialController.signIn();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([
                new CredentialReset(),
                new UserSigningIn(),
                new UserSignInProgress(`Sign-in to docs build with AAD...`, 'Sign-in'),
                new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'),
                new UserSignInFailed(`Sign-in with GitHub Failed: Timeout`),
                new CredentialReset()
            ]);
        });
    });

    it(`User sign-out`, async () => {
        // Sign-in first
        mockFakeKeyChainInfo();
        credentialController.initialize();

        // Act - Sign-out
        credentialController.signOut();

        // Assert
        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        expect(testEventBus.getEvents()).to.deep.equal([new CredentialReset(), new UserSignedOut()]);
    });
});