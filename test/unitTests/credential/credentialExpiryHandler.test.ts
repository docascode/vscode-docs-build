import assert from 'assert';
import { createSandbox, SinonSandbox, SinonStub } from "sinon";
import { Disposable } from 'vscode';
import { LanguageClient } from "vscode-languageclient/node";

import { EventStream } from "../../../src/common/eventStream"
import { BaseEvent, CredentialExpired,UserSignInFailed, UserSignInSucceeded } from "../../../src/common/loggingEvents";
import { Credential } from '../../../src/credential/credentialController';
import { CredentialExpiryHandler } from "../../../src/credential/credentialExpiryHandler";
import { GetCredentialParams, GetCredentialResponse } from "../../../src/requestTypes";
import { OP_BUILD_USER_TOKEN_HEADER_NAME, UserInfo } from "../../../src/shared";
import { getFakeEnvironmentController } from "../../utils/faker";
import TestEventBus from '../../utils/testEventBus';

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
    const credentialExpiryParam = <GetCredentialParams>{ url: 'https://buildapi.docs.microsoft.com' };

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
        const params = <GetCredentialParams>{ url: 'invalidUrl' };
        try {
            await handler.userCredentialRefreshRequestHandler(params);
        } catch (err) {
            assert.deepStrictEqual(err, new Error('Credential refresh for URL invalidUrl is not supported.'));
        }
        assert.deepStrictEqual(testEventBus.getEvents(), []);
    });

    it('Refresh token succeeds', async () => {
        const signInSucceedsEvent = new UserSignInSucceeded(undefined, <Credential>{ userInfo: <UserInfo>{ userToken: fakeToken } });
        postEvent(signInSucceedsEvent);
        const result = await handler.userCredentialRefreshRequestHandler(credentialExpiryParam);
        assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialExpired(true), signInSucceedsEvent]);
        assert.deepStrictEqual(result, <GetCredentialResponse>
            {
                http: {
                    [credentialExpiryParam.url]: {
                        'headers': { [OP_BUILD_USER_TOKEN_HEADER_NAME]: fakeToken }
                    }
                }
            });
    });

    it('Refresh token fails due to sign in failed', async () => {
        const signInFailsEvent = new UserSignInFailed(undefined, new Error('some errors'));
        postEvent(signInFailsEvent);
        try {
            await handler.userCredentialRefreshRequestHandler(credentialExpiryParam);
        } catch (err) {
            assert.deepStrictEqual(err, new Error('some errors'));
        }
        assert.deepStrictEqual(testEventBus.getEvents(), [new CredentialExpired(true), signInFailsEvent]);
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

