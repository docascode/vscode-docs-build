import { LanguageClient } from "vscode-languageclient/node";
import { EventStream } from "../common/eventStream";
import { EventType } from "../common/eventType";
import { BaseEvent, CredentialExpiredDuringLanguageServerRunning, UserSignInCompleted, UserSignInFailed, UserSignInSucceeded } from "../common/loggingEvents";
import config from '../config';
import { Subscription } from "rxjs";
import { UserCredentialRefreshRequest_Type, GetCredentialResponse, GetCredentialParams } from '../requestTypes';
import { EnvironmentController } from "../common/environmentController";

export class CredentialExpiryHandler {
    constructor(private _client: LanguageClient, private _eventStream: EventStream, private _environmentController: EnvironmentController) {
    }

    public async listenCredentialExpiryRequest(): Promise<void> {
        if (!this._client) {
            return;
        }
        return this._client.onReady().then(async () => {
            this._client.onRequest(UserCredentialRefreshRequest_Type, this.userCredentialRefreshRequestHandler.bind(this));
            return;
        });
    }

    public async userCredentialRefreshRequestHandler(params: GetCredentialParams): Promise<GetCredentialResponse> {
        return new Promise<GetCredentialResponse>(async (resolve, reject) => {
            if (params.url && params.url.startsWith(config.OPBuildAPIEndPoint[this._environmentController.env])) {
                this._eventStream.post(new CredentialExpiredDuringLanguageServerRunning());
                try {
                    const builderToken = await this.getRefreshedToken();
                    resolve(<GetCredentialResponse>{
                        http: {
                            [config.OPBuildAPIEndPoint[this._environmentController.env]]: {
                                'headers': {
                                    ['X-OP-BuildUserToken']: builderToken
                                }
                            }
                        }
                    });
                } catch (err) {
                    reject(err);
                }
            } else {
                reject(new Error('Request with invalid url.'));
            }
        });
    }

    private async getRefreshedToken(): Promise<string> {
        let subscribe: Subscription;
        return new Promise<string>((resolve, reject) => {
            subscribe = this._eventStream.subscribe((event: BaseEvent): void => {
                switch (event.type) {
                    case (EventType.UserSignInCompleted):
                        if ((<UserSignInCompleted>event).succeeded) {
                            subscribe.unsubscribe();
                            resolve((<UserSignInSucceeded>event).credential.userInfo.userToken);
                        } else {
                            subscribe.unsubscribe();
                            reject((<UserSignInFailed>event).err);
                        }
                        break;
                }
            })
        });
    }
}
