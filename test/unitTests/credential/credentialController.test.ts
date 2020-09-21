import vscode from 'vscode';
import assert from 'assert';
import { CredentialExpired, CredentialReset, EnvironmentChanged, BaseEvent, UserSignInProgress, UserSignInSucceeded, UserSignInFailed, UserSignInTriggered, UserSignOutSucceeded, UserSignOutTriggered } from '../../../src/common/loggingEvents';
import { EventStream } from '../../../src/common/eventStream';
import { CredentialController, Credential } from '../../../src/credential/credentialController';
import { KeyChain } from '../../../src/credential/keyChain';
import { EnvironmentController } from '../../../src/common/environmentController';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import TestEventBus from '../../utils/testEventBus';
import { UserInfo, uriHandler } from '../../../src/shared';
import { getFakeEnvironmentController, setupKeyChain, fakedCredential } from '../../utils/faker';
import extensionConfig from '../../../src/config';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { TimeOutError } from '../../../src/error/timeOutError';

const fakedGitHubCallbackURL = <vscode.Uri>{
    authority: 'docsmsft.docs-build',
    path: '/github-authenticate',
    query: 'id=faked-github-id&name=Fake-User-GitHub&email=fake-github@microsoft.com&X-OP-BuildUserToken=fake-github-token'
};

const fakedAzureDevOpsCallbackURL = <vscode.Uri>{
    authority: 'docsmsft.docs-build',
    path: '/azure-devops-authenticate',
    query: 'id=faked-azure-devops-id&name=Fake-User-Azure-DevOps&email=fake-azure-devops@microsoft.com&X-OP-BuildUserToken=fake-azure-devops-token'
};

describe('CredentialController', () => {
    let sinon: SinonSandbox;
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
        environmentController = getFakeEnvironmentController('GitHub');
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
        stubGetUserInfo && stubGetUserInfo.restore();
        stubConfigTimeout && stubConfigTimeout.restore();
        stubOpenExternal && stubOpenExternal.restore();
        stubCredentialControllerInitialize && stubCredentialControllerInitialize.restore();
    });

    after(() => {
        sinon.restore();
        testEventBus.dispose();
    });

    function setupAvailableKeyChain() {
        stubGetUserInfo = setupKeyChain(sinon, keyChain, fakedCredential.userInfo);
    }

    function setupUnavailableKeyChain() {
        stubGetUserInfo = setupKeyChain(sinon, keyChain, undefined);
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
            setupAvailableKeyChain();

            // Act
            await credentialController.initialize('fakedCorrelationId');

            // Assert
            let credential = credentialController.credential;
            assert.deepStrictEqual(credential, fakedCredential);
            assert.deepStrictEqual(testEventBus.getEvents(), [new UserSignInSucceeded('fakedCorrelationId', fakedCredential, true)]);
        });

        it(`Should be 'SignedOut' status if the user info can not be retrieved from keyChain`, async () => {
            // Prepare
            setupUnavailableKeyChain();

            // Act
            await credentialController.initialize('fakedCorrelationId');

            // Assert
            let credential = credentialController.credential;
            AssertCredentialReset(credential);
            assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialReset()]);
        });
    });

    describe(`User Sign-in With GitHub`, () => {
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
                userId: 'faked-github-id',
                userEmail: 'fake-github@microsoft.com',
                userName: 'Fake-User-GitHub',
                userToken: 'fake-github-token'
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
                new UserSignInProgress(`Signing in to Docs with GitHub account...`, 'Sign-in'),
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
                new UserSignInProgress(`Signing in to Docs with GitHub account...`, 'Sign-in'),
                new CredentialReset(),
                new UserSignInFailed('fakedCorrelationId', new DocsError(`Signing in with GitHub failed: please allow to open external URL to sign in`, ErrorCode.GitHubSignInExternalUrlDeclined)),
            ]);
        });

        it(`Sign-in with GitHub timed out`, async () => {
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
                new UserSignInProgress(`Signing in to Docs with GitHub account...`, 'Sign-in'),
                new CredentialReset(),
                new UserSignInFailed('fakedCorrelationId', new DocsError(`Signing in with GitHub failed: Timed out`, ErrorCode.GitHubSignInTimeOut, new TimeOutError('Timed out'))),
            ]);
        });
    });



    describe(`User signing in With Azure DevOps`, () => {
        before(() => { environmentController.docsRepoType = 'Azure DevOps'; });

        it(`Sign in successfully`, async () => {
            // Prepare
            stubOpenExternal = sinon.stub(vscode.env, 'openExternal').callsFake(
                function (target: vscode.Uri): Thenable<boolean> {
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            uriHandler.handleUri(fakedAzureDevOpsCallbackURL);
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
                signType: 'Azure DevOps',
                userId: 'faked-azure-devops-id',
                userEmail: 'fake-azure-devops@microsoft.com',
                userName: 'Fake-User-Azure-DevOps',
                userToken: 'fake-azure-devops-token'
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
                new UserSignInProgress(`Signing in to Docs with Azure DevOps account...`, 'Sign-in'),
                new UserSignInSucceeded('fakedCorrelationId', expectedCredential)
            ]);
        });

        it(`Signing in with Azure DevOps failed`, async () => {
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
                new UserSignInProgress(`Signing in to Docs with Azure DevOps account...`, 'Sign-in'),
                new CredentialReset(),
                new UserSignInFailed('fakedCorrelationId', new DocsError(`Signing in with Azure DevOps failed: please allow to open external URL to sign in`, ErrorCode.AzureDevOpsSignInExternalUrlDeclined)),
            ]);
        });

        it(`Signing in with Azure DevOps timed out`, async () => {
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
                new UserSignInProgress(`Signing in to Docs with Azure DevOps account...`, 'Sign-in'),
                new CredentialReset(),
                new UserSignInFailed('fakedCorrelationId', new DocsError(`Signing in with Azure DevOps failed: Timed out`, ErrorCode.AzureDevOpsSignInTimeOut, new TimeOutError('Timed out'))),
            ]);
        });
    });

    it(`User sign-out`, async () => {
        // Sign-in first
        setupAvailableKeyChain();
        await credentialController.initialize('fakedCorrelationId');

        // Act - Sign-out
        credentialController.signOut('fakedCorrelationId');

        // Assert
        let credential = credentialController.credential;
        AssertCredentialReset(credential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new UserSignInSucceeded('fakedCorrelationId', fakedCredential, true),
            new UserSignOutTriggered('fakedCorrelationId'),
            new CredentialReset(),
            new UserSignOutSucceeded('fakedCorrelationId')
        ]);
    });
});