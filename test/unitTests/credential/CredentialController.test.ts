import * as vscode from 'vscode';
import { CredentialExpiry, ResetCredential, RefreshCredential, EnvironmentChange, BaseEvent, FetchFromLocalCredentialManager, UserSignedOut, LogProgress, UserSigningIn, UserSignedIn, SignInFailed } from '../../../src/common/loggingEvents';
import { EventStream } from '../../../src/common/EventStream';
import { CredentialController, Credential } from '../../../src/credential/CredentialController';
import { KeyChain } from '../../../src/credential/KeyChain';
import { EnvironmentController } from '../../../src/common/EnvironmentController';
// import { UserInfo } from '../../../src/common/shared';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import { expect } from 'chai';
import TestEventBus from '../../utils/TestEventBus';
import { UserInfo, uriHandler, extensionConfig } from '../../../src/common/shared';

describe('CredentialController', () => {
    let sinon: SinonSandbox;
    let stubGetAADInfo: SinonStub;
    let stubGetUserInfo: SinonStub;
    let stubCredentialControllerInitialize: SinonStub;
    let stubOpenExternal: SinonStub;
    let stubConfigTimeout: SinonStub;

    let eventStream = new EventStream();
    let environmentController = new EnvironmentController(eventStream);
    let keyChain = new KeyChain(environmentController);
    let credentialController = new CredentialController(keyChain, eventStream, environmentController);
    let testEventBus = new TestEventBus(eventStream);

    let setUserInfo: UserInfo;
    let setAADInfo: string;
    let isSetAADInfoCalled: boolean;
    let isSetUserInfoCalled: boolean;
    let isResetAADInfoCalled: boolean;
    let isResetUserInfoCalled: boolean;
    let isCredentialControllerInitializeCalled: boolean;

    before(() => {
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

    function mocFakeKeyChainInfo() {
        stubGetAADInfo = sinon.stub(keyChain, 'getAADInfo').resolves('fake-aad');
        stubGetUserInfo = sinon.stub(keyChain, 'getUserInfo').resolves(<UserInfo>{
            signType: 'GitHub',
            userEmail: 'fake@microsoft.com',
            userName: 'Fake User',
            userToken: 'fake-token'
        });
    }

    function mocUndefinedKeyChainInfo() {
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
        new RefreshCredential(),
        new EnvironmentChange('PPE')
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

    it('CredentialExpiry: Credentail should be reset', () => {
        let event = new CredentialExpiry();
        credentialController.eventHandler(event);

        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        expect(testEventBus.getEvents()).to.deep.equal([new ResetCredential()]);
    });

    describe(`Initialize`, () => {
        it(`Should be 'SignedIn' status if the user info can be fetched from keyChain`, async () => {
            // Prepare
            mocFakeKeyChainInfo();

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
                    userName: 'Fake User',
                    userToken: 'fake-token'
                }
            };
            expect(credential).to.deep.equal(expectedCredential);
            expect(testEventBus.getEvents()).to.deep.equal([new FetchFromLocalCredentialManager(expectedCredential)]);
        });

        it(`Should be 'SignedOut' status if the user info can not be fetched from keyChain`, async () => {
            // Prepare
            mocUndefinedKeyChainInfo();

            // Act
            await credentialController.initialize();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([new ResetCredential()]);
        });
    });

    describe(`User Sign in`, () => {
        it(`Sign in successfully`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        if (target.authority === 'login.microsoftonline.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(vscode.Uri.parse('vscode://ceapex.docs-build/aad-authenticate'));
                            }, 10);
                        } else if (target.authority === 'github.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(vscode.Uri.parse('vscode://ceapex.docs-build/github-authenticate?name=Fake%20User&email=fake@microsoft.com&X-OP-BuildUserToken=fake-token'));
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
                userName: 'Fake User',
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
                new ResetCredential(),
                new UserSigningIn(),
                new LogProgress(`Sign in to docs build with AAD...`, 'Sign In'),
                new LogProgress(`Sign in to docs build with GitHub account...`, 'Sign In'),
                new UserSignedIn(expectedCredential)
            ]);
        });

        it(`Sign in with AAD failed`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').resolves(false);

            // Act
            await credentialController.signIn();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([
                new ResetCredential(),
                new UserSigningIn(),
                new LogProgress(`Sign in to docs build with AAD...`, 'Sign In'),
                new SignInFailed(`Sign In with AAD Failed`),
                new ResetCredential()
            ]);
        });

        it(`Sign in with GitHub failed`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        if (target.authority === 'login.microsoftonline.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(vscode.Uri.parse('vscode://ceapex.docs-build/aad-authenticate'));
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
                new ResetCredential(),
                new UserSigningIn(),
                new LogProgress(`Sign in to docs build with AAD...`, 'Sign In'),
                new LogProgress(`Sign in to docs build with GitHub account...`, 'Sign In'),
                new SignInFailed(`Sign In with GitHub Failed`),
                new ResetCredential()
            ]);
        });

        it(`Sign in with AAD time out`, async () => {
            // Prepare
            // Overwrite sign in timeout to 1s.
            stubConfigTimeout = sinon.stub(extensionConfig, 'SignInTimeOut').get(() => {
                return 1000;
            });
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').resolves(true);

            // Act
            await credentialController.signIn();

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            expect(testEventBus.getEvents()).to.deep.equal([
                new ResetCredential(),
                new UserSigningIn(),
                new LogProgress(`Sign in to docs build with AAD...`, 'Sign In'),
                new SignInFailed(`Sign In with AAD Failed: Timeout`),
                new ResetCredential()
            ]);
        });

        it(`Sign in with GitHub time out`, async () => {
            // Prepare
            // Overwrite sign in timeout to 1s.
            stubConfigTimeout = sinon.stub(extensionConfig, 'SignInTimeOut').get(() => {
                return 1000;
            });
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        if (target.authority === 'login.microsoftonline.com') {
                            setTimeout(() => {
                                uriHandler.handleUri(vscode.Uri.parse('vscode://ceapex.docs-build/aad-authenticate'));
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
                new ResetCredential(),
                new UserSigningIn(),
                new LogProgress(`Sign in to docs build with AAD...`, 'Sign In'),
                new LogProgress(`Sign in to docs build with GitHub account...`, 'Sign In'),
                new SignInFailed(`Sign In with GitHub Failed: Timeout`),
                new ResetCredential()
            ]);
        });
    });

    it(`User sign out`, async () => {
        // Sign In first
        mocFakeKeyChainInfo();
        credentialController.initialize();

        // Act - Sign out
        credentialController.signOut();

        // Assert
        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        expect(testEventBus.getEvents()).to.deep.equal([new ResetCredential(), new UserSignedOut()]);
    });
});