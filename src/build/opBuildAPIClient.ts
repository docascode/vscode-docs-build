import request from 'request';
import querystring from 'querystring';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import extensionConfig from '../config';
import { APICallFailed, APICallStarted, CredentialExpired, BuildProgress } from '../common/loggingEvents';

const OP_BUILD_USER_TOKEN_HEADER_NAME = 'X-OP-BuildUserToken';

type RequestMethod = 'POST' | 'GET';

export class OPBuildAPIClient {
    constructor(private _environmentController: EnvironmentController) { }

    public async getProvisionedRepositoryUrlByRepositoryUrl(gitRepoUrl: string, opBuildUserToken: string, eventStream: EventStream): Promise<string> {
        const requestUrl = `${this.APIBaseUrl}/v2/Repositories/ProvisionedRepositoryUrlByRepositoryUrl`
            + `?${querystring.stringify({
                gitRepoUrl
            })}`;

        return this.sendRequest('GetProvisionedRepositoryUrlByRepositoryUrl', requestUrl, 'GET', opBuildUserToken, eventStream, {}, [200, 404])
            .then((response: any) => {
                if (response.statusCode !== 200) {
                    eventStream.post(new BuildProgress(`[OPBuildAPIClient.GetProvisionedRepositoryUrlByRepositoryUrl] Get provisioned repository information by repository URL failed: (${response.body.error})${response.body.message}`));
                    return undefined;
                }
                return response.body.toString();
            }, (code: any) => {
                throw new Error(`Cannot retrieve the original repository URL for current repository (${code})`);
            });
    }

    public async validateCredential(opBuildUserToken: string, eventStream: EventStream): Promise<boolean> {
        const requestUrl = `${this.APIBaseUrl}/v1/Users/OpsPermission`;

        return this.sendRequest('ValidateCredential', requestUrl, 'GET', opBuildUserToken, eventStream, {}, [200, 401])
            .then((response: any) => {
                return response.statusCode === 200;
            }, (code: any) => {
                throw new Error(`Cannot get the credential verify result. (${code})`);
            });
    }

    public async getProvisionedRepositoryUrlByDocsetNameAndLocale(docsetName: string, locale: string = 'en-us', opBuildUserToken: string, eventStream: EventStream): Promise<string> {
        const requestUrl = `${this.APIBaseUrl}/v2/Repositories/ProvisionedRepositoryUrlByDocsetNameAndLocale`
            + `?${querystring.stringify({
                docsetName,
                locale
            })}`;

        return this.sendRequest('GetProvisionedRepositoryUrlByDocsetNameAndLocale', requestUrl, 'GET', opBuildUserToken, eventStream, {}, [200])
            .then((response: any) => {
                return response.body.toString();
            }, (code: any) => {
                throw new Error(`Cannot retrieve the original repository URL for current docset and locale (${code})`);
            });
    }

    private get APIBaseUrl() {
        return extensionConfig.OPBuildAPIEndPoint[this._environmentController.env];
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
        if (token) {
            headers[OP_BUILD_USER_TOKEN_HEADER_NAME] = token;
        }

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
                    reject(error.message);
                }

                if (!acceptedStatusCode.includes(response.statusCode)) {
                    if (response.statusCode === 401) {
                        eventStream.post(new CredentialExpired());
                        reject(response.statusCode);
                    }

                    eventStream.post(new APICallFailed(name, url, `${respObj.error ? (`${respObj.error}(${response.statusCode}): `) : 'error: '}`
                        + `${respObj.message ? respObj.message : JSON.stringify(respObj)}`));
                    reject(response.statusCode);
                }
                resolve({
                    statusCode: response.statusCode,
                    body: respObj
                });
            });
        });
        return promise;
    }
}