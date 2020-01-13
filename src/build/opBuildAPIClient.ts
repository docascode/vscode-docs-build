import * as request from 'request';
import * as querystring from 'querystring';
import { EnvironmentController } from '../common/EnvironmentController';
import { EventStream } from '../common/EventStream';
import { extensionConfig } from '../shared';
import { APICallFailed, APICallStarted, CredentialExpired } from '../common/loggingEvents';

const OP_BUILD_USER_TOKEN_HEADER_NAME = 'X-OP-BuildUserToken';

type RequestMethod = 'POST' | 'GET';

export class OPBuildAPIClient {
    constructor(private environmentController: EnvironmentController) { }

    public async getOriginalRepositoryUrl(gitRepoUrl: string, opBuildUserToken: string, eventStream: EventStream): Promise<string> {
        const requestUrl = `${this.APIBaseUrl}/v2/Repositories/OriginalRepositoryUrl`
            + `?${querystring.stringify({
                gitRepoUrl
            })}`;

        return this.sendRequest('GetOriginalRepositoryUrl', requestUrl, 'GET', opBuildUserToken, eventStream)
            .then((response: any) => {
                return response.toString();
            }, (code: any) => {
                throw new Error(`Cannot the get original repository URL for current repository(${code})`);
            });
    }

    private get APIBaseUrl() {
        return extensionConfig.OPBuildAPIEndPoint[this.environmentController.env];
    }

    private async sendRequest(
        name: string,
        url: string,
        method: RequestMethod,
        token: string,
        eventStream: EventStream,
        reqObj: any = {},
        acceptedStatusCode: number[] = [200],
        headers: any = {},
    ): Promise<any> {
        method = method || 'GET';
        headers[OP_BUILD_USER_TOKEN_HEADER_NAME] = token;

        eventStream.post(new APICallStarted(name, url));
        const promise = new Promise((resolve, reject) => {
            request({
                url,
                method,
                headers,
                json: true,
                body: reqObj,
            }, (error, response, respObj) => {
                if (error) {
                    eventStream.post(new APICallFailed(name, url, error.message));
                    reject();
                }

                if (!acceptedStatusCode.includes(response.statusCode)) {
                    if (response.statusCode === 401) {
                        eventStream.post(new CredentialExpired());
                    }

                    eventStream.post(new APICallFailed(name, url, `${respObj.error ? (`${respObj.error}(${response.statusCode}): `) : 'error: '}`
                        + `${respObj.message ? respObj.message : JSON.stringify(respObj)}`));
                    reject(response.statusCode);
                }
                resolve(respObj);
            });
        });
        return promise;
    }
}