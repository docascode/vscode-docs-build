import { LanguageClient, ResponseError } from "vscode-languageclient/node";
import { EventStream } from "../common/eventStream";
import { EventType } from "../common/eventType";
import { BaseEvent, CredentialExpiredDuringLanguageServerRunning, UserSignInCompleted, UserSignInSucceeded } from "../common/loggingEvents";
import { delay } from '../utils/utils';
import config from '../config';
import { TimeOutError } from '../error/timeOutError';
import { Subscription } from "rxjs";
import { UserCredentialRefreshRequest_Type, UserCredentialRefreshResponse, UserCredentialRefreshParams, CredentialRefreshResponse } from '../requestTypes';
import { EnvironmentController } from "../common/environmentController";

export class CredentialExpiryHandler {
    constructor(private _client: LanguageClient, private _eventStream: EventStream, private _environmentController: EnvironmentController) { }

    public async listenCredentialExpiryRequest(): Promise<void> {
        if (!this._client) {
            return;
        }
        return this._client.onReady().then(async () => {
            this._client.onRequest(UserCredentialRefreshRequest_Type, this.userCredentialRefreshRequestHandler);
            return;
        });
    }

    public async userCredentialRefreshRequestHandler(params: UserCredentialRefreshParams): Promise<UserCredentialRefreshResponse> {
        if (params.url && params.url.startsWith(config.OPBuildAPIEndPoint[this._environmentController.env])) {
            this._eventStream.post(new CredentialExpiredDuringLanguageServerRunning());
            try {
                const token = await this.getRefreshedToken();
                return <UserCredentialRefreshResponse>{
                    result: <CredentialRefreshResponse>{ headers: { [params.url]: token } }
                };
            } catch (err) {
                return <UserCredentialRefreshResponse>{
                    error: <ResponseError<void>>{ message: (<Error>err).message }
                };
            }
        } else {
            return <UserCredentialRefreshResponse>{
                error: <ResponseError<void>>{ message: 'Request with invalid url.' }
            };
        }
    }

    private async getRefreshedToken() {
        let subscribe: Subscription;
        return Promise.race([
            delay(config.SignInTimeOut, new TimeOutError('Timed out, token refresh failed.')),
            new Promise<string>((resolve, reject) => {
                subscribe = this._eventStream.subscribe((event: BaseEvent): void => {
                    switch (event.type) {
                        case (EventType.UserSignInCompleted):
                            if ((<UserSignInCompleted>event).succeeded) {
                                resolve((<UserSignInSucceeded>event).credential.userInfo.userToken);
                            } else {
                                reject(new Error('Sign in failed, token refresh failed.'));
                            }
                            break;
                    }
                })
            }).then((result) => {
                subscribe.unsubscribe();
                return result;
            }).catch((err) => {
                subscribe.unsubscribe();
                throw err;
            })
        ]);
    }
}
