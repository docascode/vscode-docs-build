import * as vscode from 'vscode';
import * as request from 'request';
import * as querystring from 'querystring';
import { BuildEnv, DocsetInfo, IExecError } from './shared';
import { docsChannel } from './docsChannel';
import { credentialController } from '../credential/credentialController';
const config = require('../../configs/vscode-docs-build.json');

const OP_BUILD_USER_TOKEN_HEADER_NAME = 'X-OP-BuildUserToken';

export class OpBuildAPIClient implements vscode.Disposable {
  private APIBaseUrl: string;

  constructor(buildEnv: BuildEnv, oPBuildUserToken: string) {
    this.APIBaseUrl = config.OPBuildAPIEndPoint[buildEnv.toString()];
  }

  public getDocsetInfo(gitRepoUrl: string): Promise<DocsetInfo> {
    const requestUrl = `${this.APIBaseUrl}/v2/Queries/Docsets`
      + `?${querystring.stringify({
        git_repo_url: gitRepoUrl,
        docset_query_status: 'Created',
      })}`;
    console.log(`[opBuildApiClient.getDocSets] Get ${requestUrl}`);

    return this.sendRequest(requestUrl, 'GET')
      .then((docsets) => {
        if (!Array.isArray(docsets) || isResultEmpty(docsets)) {
          docsChannel.appendLine(`[GetDocsetInfo] Invalid response: ${JSON.stringify(docsets)}`);
          throw new Error(`Cannot the get docset information for current repository`);
        }
        return {
          BasePath: docsets[0].base_path,
          ProductName: docsets[0].product_name,
          SiteName: docsets[0].site_name
        };
      }, (code) => {
        docsChannel.appendLine(`[GetDocsetInfo] API call failed(${code})`);
        var error: IExecError;
        if (code === 401) {
          error = new Error(`Cannot the get docset information for current repository(${code}): The login info has expired, please re-sign`);
          credentialController.signOut();
          error.action = { title: 'Sign In', command: 'docs.signIn' }
        } else {
          error = new Error(`Cannot the get docset information for current repository(${code})`);
        }

        throw error;
      });
  };

  private sendRequest(
    url: string,
    method: string,
    reqObj: any = {},
    acceptedStatusCode: number[] = [200],
    headers: any = {}
  ): Promise<any> {
    method = method || 'GET';
    headers[OP_BUILD_USER_TOKEN_HEADER_NAME] = credentialController.account.userInfo!.userToken;
    const promise = new Promise((resolve, reject) => {
      request({
        url,
        method,
        headers,
        json: true,
        body: reqObj,
      }, (error, response, respObj) => {
        if (error) {
          docsChannel.appendLine(error);
          reject(error);
        }

        if (!acceptedStatusCode.includes(response.statusCode)) {
          console.log(
            `Request: [${decodeURIComponent(url)}] failed\n`
            + `${respObj.error ? (`${respObj.error}(${response.statusCode}): `) : 'error: '}`
            + `${respObj.message ? respObj.message : JSON.stringify(respObj)}`,
          );
          reject(response.statusCode);
        }
        resolve(respObj);
      });
    });
    return promise;
  };

  public dispose(): void {

  }
}

function isResultEmpty(result: any): boolean {
  if (Array.isArray(result)) {
    return result.length <= 0;
  }

  if (result.constructor === Object) {
    return Object.keys(result).length === 0;
  }

  return !!result;
};