import { createSandbox, SinonSandbox, SinonStub } from "sinon";
import { LanguageClient, ResponseError } from "vscode-languageclient/node";
import { EventStream } from "../../../src/common/eventStream"
import { CredentialExpiryHandler } from "../../../src/credential/credentialExpiryHandler";
import { UserCredentialRefreshParams, UserCredentialRefreshResponse, CredentialRefreshResponse } from "../../../src/requestTypes";
import TestEventBus from '../../utils/testEventBus';
import assert from 'assert';
import { CredentialExpiredDuringLanguageServerRunning, UserSignInFailed, UserSignInSucceeded, BaseEvent } from "../../../src/common/loggingEvents";
import { Credential } from '../../../src/credential/credentialController';
import { UserInfo } from "../../../src/shared";
import extensionConfig from '../../../src/config';
import { Disposable } from 'vscode';
import { getFakeEnvironmentController } from "../../utils/faker";

describe(('Handle credential expiry during language server is running'), () => {
    let sinon: SinonSandbox;
    const eventStream = new EventStream();
    const fakeLanguageClient = <LanguageClient><unknown>{
        onReady: () => { return Promise.resolve() },
        onRequest: () => { return new Disposable(() => {/**/ }) }
    };
    const fakeEnvironmentController = getFakeEnvironmentController();

    const handler = new CredentialExpiryHandler(fakeLanguageClient, eventStream, fakeEnvironmentController);
    const testEventBus = new TestEventBus(eventStream);
    const fakeToken = 'fakeToken';
    const credentialExpiryParam = <UserCredentialRefreshParams>{ url: 'https://op-build-prod.azurewebsites.net' };

    let stubOnRequest: SinonStub;

    before(() => {
        sinon = createSandbox();
        stubOnRequest = sinon.stub(fakeLanguageClient, 'onRequest');
    });

    beforeEach(() => {
        testEventBus.clear();
    });

    afterEach(() => {
        stubOnRequest.restore();
    });

    after(() => {
        sinon.restore();
    });

    it('Client not ready', async () => {
        const stubOnReady = sinon.stub(fakeLanguageClient, 'onReady').rejects();
        handler.userCredentialRefreshRequestHandler(credentialExpiryParam);
        assert(stubOnRequest.notCalled);
        stubOnReady.restore();
    })

    it('Request with invalid url', async () => {
        const params = <UserCredentialRefreshParams>{ url: 'invalidUrl' };
        const result = await handler.userCredentialRefreshRequestHandler(params);
        assert.deepStrictEqual(testEventBus.getEvents(), []);
        assert.deepStrictEqual(result,
            <UserCredentialRefreshResponse>
            {
                error: <ResponseError<void>>{
                    message: 'Request with invalid url.'
                }
            });
    });

    it('Refresh token succeeds', async () => {
        const signInSucceedsEvent = new UserSignInSucceeded(undefined, <Credential>{ userInfo: <UserInfo>{ userToken: fakeToken } });

        postEvent(signInSucceedsEvent);
        const result = await handler.userCredentialRefreshRequestHandler(credentialExpiryParam);
        assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialExpiredDuringLanguageServerRunning(), signInSucceedsEvent]);
        assert.deepStrictEqual(result, <UserCredentialRefreshResponse>
            {
                result: <CredentialRefreshResponse>{
                    headers: { [credentialExpiryParam.url]: fakeToken }
                }
            });
    });

    it('Refresh token fails due to sign in failed', async () => {
        const signInFailsEvent = new UserSignInFailed(undefined, new Error('some error'));

        postEvent(signInFailsEvent);
        const result = await handler.userCredentialRefreshRequestHandler(credentialExpiryParam);
        assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialExpiredDuringLanguageServerRunning(), signInFailsEvent]);
        assert.deepStrictEqual(result, <UserCredentialRefreshResponse>
            {
                error: <ResponseError<void>>{
                    message: 'Sign in failed, token refresh failed.'
                }
            });
    });

    it('Refresh token fails due to time out', async () => {
        const stubConfigTimeout = sinon.stub(extensionConfig, 'SignInTimeOut').get(() => {
            return 200;
        });
        const result = await handler.userCredentialRefreshRequestHandler(credentialExpiryParam);
        assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialExpiredDuringLanguageServerRunning()]);
        assert.deepStrictEqual(result, <UserCredentialRefreshResponse>
            {
                error: <ResponseError<void>>{
                    message: 'Timed out, token refresh failed.'
                }
            });
        stubConfigTimeout.restore();
    });

    async function postEvent(event: BaseEvent): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                eventStream.post(event);
                resolve();
            }, 200)
        })
    }
});

