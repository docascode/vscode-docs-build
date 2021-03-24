import { Subscription } from "rxjs";
import { LanguageClient } from "vscode-languageclient/node";

import { EnvironmentController } from "../common/environmentController";
import { EventStream } from "../common/eventStream";
import { EventType } from "../common/eventType";
import { BaseEvent, CredentialExpired, CredentialRefreshFailed, UserSignInCompleted, UserSignInFailed, UserSignInSucceeded } from "../common/loggingEvents";
import config from '../config';
import { GetCredentialParams, GetCredentialResponse, UserCredentialRefreshRequest_Type } from '../requestTypes';
import { OP_BUILD_USER_TOKEN_HEADER_NAME, UserType } from "../shared";

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
            if (this._environmentController.userType === UserType.PublicContributor) {
                const err = new Error(`Some required data to validate this repository is only accessible to Microsoft employee. ` +
                    `If you are a Microsoft employee, you can change the user type in extension settings.`)
                this._eventStream.post(new CredentialRefreshFailed(err));
                reject(err);
                return;
            }
            if (params.url && params.url.startsWith(config.OPBuildAPIEndPoint[this._environmentController.env])) {
                this._eventStream.post(new CredentialExpired(true));
                try {
                    const builderToken = await this.getRefreshedToken();
                    resolve(<GetCredentialResponse>{
                        http: {
                            [config.OPBuildAPIEndPoint[this._environmentController.env]]: {
                                'headers': {
                                    [OP_BUILD_USER_TOKEN_HEADER_NAME]: builderToken
                                }
                            }
                        }
                    });
                } catch (err) {
                    this._eventStream.post(new CredentialRefreshFailed(err));
                    reject(err);
                }
            } else {
                const err = new Error(`Credential refresh for URL ${params.url} is not supported.`);
                this._eventStream.post(new CredentialRefreshFailed(err));
                reject(err);
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
                            resolve((<UserSignInSucceeded>event).credential.userInfo.userToken);
                        } else {
                            reject((<UserSignInFailed>event).err);
                        }
                        subscribe.unsubscribe();
                        break;
                }
            })
        });
    }
}
