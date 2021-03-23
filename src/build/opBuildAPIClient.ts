import https from 'https';
import querystring from 'querystring';
import { URL } from 'url';

import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { APICallFailed, APICallStarted, CredentialExpired } from '../common/loggingEvents';
import extensionConfig from '../config';
import { OP_BUILD_USER_TOKEN_HEADER_NAME } from '../shared';

export class OPBuildAPIClient {
    constructor(private _environmentController: EnvironmentController) { }

    public async validateCredential(opBuildUserToken: string, eventStream: EventStream): Promise<boolean> {
        const requestUrl = `${this.APIBaseUrl}/v1/Users/OpsPermission`;

        return this.get('ValidateCredential', requestUrl, opBuildUserToken, eventStream, [200, 401])
            .then((response: any) => {
                return response.statusCode === 200;
            }, (code: any) => {
                throw new Error(`Cannot get the credential verify result. (${code})`);
            });
    }

    public async getProvisionedRepositoryUrlByDocsetNameAndLocale(docsetName: string, locale = 'en-us', opBuildUserToken: string, eventStream: EventStream): Promise<string> {
        const requestUrl = `${this.APIBaseUrl}/v2/Repositories/ProvisionedRepositoryUrlByDocsetNameAndLocale`
            + `?${querystring.stringify({
                docsetName,
                locale
            })}`;

        return this.get('GetProvisionedRepositoryUrlByDocsetNameAndLocale', requestUrl, opBuildUserToken, eventStream, [200])
            .then((response: any) => {
                return response.body;
            }, (code: any) => {
                throw new Error(`Cannot retrieve the original repository URL for current docset and locale (${code})`);
            });
    }

    private get APIBaseUrl() {
        return extensionConfig.OPBuildAPIEndPoint[this._environmentController.env];
    }

    private async get(
        name: string,
        url: string,
        token: string,
        eventStream: EventStream,
        acceptedStatusCode: number[] = [200],
        headers: any = {},
    ): Promise<any> {
        if (token) {
            headers[OP_BUILD_USER_TOKEN_HEADER_NAME] = token;
        }

        eventStream.post(new APICallStarted(name, url));
        const promise = new Promise((resolve, reject) => {
            const options: https.RequestOptions = {
                headers: headers,
            };

            const buffers: any[] = [];
            https.get(
                new URL(url),
                options,
                response => {
                    if (response.statusCode === 401) {
                        eventStream.post(new CredentialExpired());
                        reject(response.statusCode);
                    }

                    response.on('data', data => {
                        buffers.push(data);
                    })

                    response.on('end', () => {
                        const respObj = JSON.parse(buffers.toString());

                        if (!acceptedStatusCode.includes(response.statusCode)) {
                            eventStream.post(new APICallFailed(name, url, `${respObj.error}(${response.statusCode}): `
                                + `${respObj.message ? respObj.message : JSON.stringify(respObj)}`));
                            reject(response.statusCode);
                        } else {
                            resolve({
                                statusCode: response.statusCode,
                                body: respObj,
                            });
                        }
                    })
                }
            ).on('error', (e) => {
                eventStream.post(new APICallFailed(name, url, e.message));
                reject(e.message);
            });
        });
        return promise;
    }
}