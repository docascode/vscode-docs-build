import { AzureEnvironment } from 'ms-rest-azure';
import querystring from 'querystring';
import vscode from 'vscode';

import { DocfxExecutionResult } from '../build/buildResult';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { EventType } from '../common/eventType';
import { BaseEvent, BuildCompleted, BuildFailed, CredentialExpired,CredentialReset, PublicContributorSignIn, StartLanguageServerCompleted, UserSignInFailed, UserSignInProgress, UserSignInSucceeded, UserSignInTriggered, UserSignOutFailed, UserSignOutSucceeded, UserSignOutTriggered } from '../common/loggingEvents';
import extensionConfig from '../config';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { TimeOutError } from '../error/timeOutError';
import { DocsSignInStatus, EXTENSION_ID, OP_BUILD_USER_TOKEN_HEADER_NAME,SignInReason, uriHandler, UserInfo, UserType } from '../shared';
import { delay, getCorrelationId,parseQuery, trimEndSlash } from '../utils/utils';
import { KeyChain } from './keyChain';

async function handleAuthCallback(callback: (uri: vscode.Uri, resolve: (result: any) => void, reject: (reason: any) => void) => void): Promise<any> {
    let uriEventListener: vscode.Disposable;
    return Promise.race([
        delay(extensionConfig.SignInTimeOut, new TimeOutError('Timed out')),
        new Promise((resolve: (result: any) => void, reject: (reason: any) => void) => {
            uriEventListener = uriHandler.event((uri) => callback(uri, resolve, reject));
        }).then(result => {
            uriEventListener.dispose();
            return result;
        }).catch(err => {
            uriEventListener.dispose();
            throw err;
        })
    ]);
}

export interface Credential {
    readonly signInStatus: DocsSignInStatus;
    readonly userInfo: UserInfo;
}

export class CredentialController {
    private _signInStatus: DocsSignInStatus;
    private _userInfo: UserInfo;
    private _signInReason: SignInReason;

    constructor(private _keyChain: KeyChain, private _eventStream: EventStream, private _environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent): void => {
        switch (event.type) {
            case EventType.EnvironmentChanged:
            case EventType.RefreshCredential:
                this.initialize(getCorrelationId());
                break;
            case EventType.CredentialExpired:
                this.resetCredential();
                if ((<CredentialExpired>event).duringLanguageServerRunning) {
                    this._signInReason = 'RealTimeValidation';
                }
                break;
            case EventType.BuildCompleted:
                if ((<BuildCompleted>event).result === DocfxExecutionResult.Failed) {
                    if (this.isSignInError((<BuildFailed>event).err)) {
                        this._signInReason = 'FullRepoValidation';
                    }
                }
                break;
            case EventType.StartLanguageServerCompleted:
                if (!(<StartLanguageServerCompleted>event).succeeded) {
                    if (this.isSignInError((<StartLanguageServerCompleted>event).err)) {
                        this._signInReason = 'RealTimeValidation';
                    }
                }
                break;
        }
    }

    public async initialize(correlationId: string): Promise<void> {
        await this.refreshCredential(correlationId);
    }

    public get credential(): Credential {
        return {
            signInStatus: this._signInStatus,
            userInfo: this._userInfo
        };
    }

    public async signIn(correlationId: string): Promise<void> {
        if (this._environmentController.userType === UserType.PublicContributor) {
            this._eventStream.post(new PublicContributorSignIn());
            return;
        }
        try {
            this.resetCredential();
            this._signInStatus = 'SigningIn';
            this._eventStream.post(new UserSignInTriggered(correlationId));
            let userInfo;
            if (this._environmentController.docsRepoType === 'GitHub') {
                this._eventStream.post(new UserSignInProgress(`Signing in to Docs with GitHub account...`, 'Sign-in'));
                userInfo = await this.signInWithGitHub();
            } else {
                this._eventStream.post(new UserSignInProgress(`Signing in to Docs with Azure DevOps account...`, 'Sign-in'));
                userInfo = await this.signInWithAzureDevOps();
            }

            this._signInStatus = 'SignedIn';
            this._userInfo = userInfo;
            await this._keyChain.setUserInfo(userInfo);
            this._eventStream.post(new UserSignInSucceeded(correlationId, this.credential, false, this._signInReason));
            this.resetSignInReason();
        } catch (err) {
            this.resetCredential();
            this._eventStream.post(new UserSignInFailed(correlationId, err, this._signInReason));
            this.resetSignInReason();
        }
    }

    public signOut(correlationId: string): void {
        this._eventStream.post(new UserSignOutTriggered(correlationId));
        try {
            this.resetCredential();
            this._eventStream.post(new UserSignOutSucceeded(correlationId));
        } catch (err) {
            this._eventStream.post(new UserSignOutFailed(correlationId, err));
        }
    }

    private resetCredential() {
        this._keyChain.resetUserInfo();
        this._signInStatus = 'SignedOut';
        this._userInfo = undefined;
        this._eventStream.post(new CredentialReset());
    }

    private async refreshCredential(correlationId: string): Promise<void> {
        if (this._environmentController.userType !== UserType.MicrosoftEmployee) {
            this.resetCredential();
            return;
        }
        const userInfo = await this._keyChain.getUserInfo();
        if (userInfo) {
            this._signInStatus = 'SignedIn';
            this._userInfo = userInfo;
            this._eventStream.post(new UserSignInSucceeded(correlationId, this.credential, true));
        } else {
            this.resetCredential();
        }
    }

    private async getSignInUrl(callbackUri: string): Promise<string> {
        const authConfig = extensionConfig.auth[this._environmentController.env];
        const query = querystring.stringify({
            client_id: authConfig.AADAuthClientId,
            redirect_uri: authConfig.AADAuthRedirectUrl,
            scope: authConfig.AADAuthScope,
            state: callbackUri,
            resource: authConfig.AADAuthResource,
            response_type: 'code',
            response_mode: 'query'
        });
        return `${trimEndSlash(AzureEnvironment.Azure.activeDirectoryEndpointUrl)}/${authConfig.AADAuthTenantId}/oauth2/authorize?${query}`;
    }

    private async signInWithGitHub(): Promise<UserInfo | null> {
        const authConfig = extensionConfig.auth[this._environmentController.env];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${EXTENSION_ID}/github-authenticate?${querystring.stringify({ response_mode: "query" })}`));
        const githubQuery = querystring.stringify({
            client_id: authConfig.GitHubOauthClientId,
            redirect_uri: authConfig.GitHubOauthRedirectUrl,
            scope: authConfig.GitHubOauthScope,
            // Note: `vscode.Uri.toString` by default encode = into %3D, skip this encode here.
            state: callbackUri.toString(true)
        });
        const githubSignInUrl = `https://github.com/login/oauth/authorize?${githubQuery}`;
        const signInUrl = await this.getSignInUrl(githubSignInUrl);

        // Note: vscode Uri is buggy when the query string value contains &
        // https://github.com/microsoft/vscode/pull/83060/files
        // Use <any> cast here to bypass vscode URL conversion.
        const opened = await vscode.env.openExternal(<any>signInUrl);
        if (!opened) {
            // User decline to open external URL to sign in
            throw new DocsError(`Signing in with GitHub failed: please allow to open external URL to sign in`, ErrorCode.GitHubSignInExternalUrlDeclined);
        }

        try {
            return await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: UserInfo) => void, reject: (reason: any) => void) => {
                try {
                    const query = parseQuery(uri);

                    resolve({
                        userId: query.id,
                        userName: query.name,
                        userEmail: query.email,
                        userToken: query[OP_BUILD_USER_TOKEN_HEADER_NAME],
                        signType: 'GitHub'
                    });
                } catch (err) {
                    reject(err);
                }
            });
        } catch (err) {
            const errorCode = err instanceof TimeOutError ? ErrorCode.GitHubSignInTimeOut : ErrorCode.GitHubSignInFailed;
            throw new DocsError(`Signing in with GitHub failed: ${err.message}`, errorCode, err);
        }
    }

    private async signInWithAzureDevOps(): Promise<UserInfo | null> {
        const authConfig = extensionConfig.auth[this._environmentController.env];
        const callbackUri = await vscode.env.asExternalUri(
            vscode.Uri.parse(`${vscode.env.uriScheme}://${EXTENSION_ID}/azure-devops-authenticate?${querystring.stringify({ response_mode: "query" })}`));
        const azureDevOpsQuery = querystring.stringify({
            client_id: authConfig.AzureDevOpsOauthClientId,
            redirect_uri: authConfig.AzureDevOpsRedirectUrl,
            scope: authConfig.AzureDevOpsOauthScope,
            response_type: 'Assertion',
            // Note: `vscode.Uri.toString` by default encode = into %3D, skip this encode here.
            state: callbackUri.toString(true)
        });
        const azureDevOpsSignInUrl = `https://app.vssps.visualstudio.com/oauth2/authorize?${azureDevOpsQuery}`;
        const signInUrl = await this.getSignInUrl(azureDevOpsSignInUrl);

        // Use <any> cast here to bypass vscode URL conversion.
        const opened = await vscode.env.openExternal(<any>signInUrl);
        if (!opened) {
            // User decline to open external URL to sign in
            throw new DocsError(`Signing in with Azure DevOps failed: please allow to open external URL to sign in`, ErrorCode.AzureDevOpsSignInExternalUrlDeclined);
        }

        try {
            return await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: UserInfo) => void, reject: (reason: any) => void) => {
                try {
                    const query = parseQuery(uri);

                    resolve({
                        userId: query.id,
                        userName: query.name,
                        userEmail: query.email,
                        userToken: query[OP_BUILD_USER_TOKEN_HEADER_NAME],
                        signType: 'Azure DevOps'
                    });
                } catch (err) {
                    reject(err);
                }
            });
        } catch (err) {
            const errorCode = err instanceof TimeOutError ? ErrorCode.AzureDevOpsSignInTimeOut : ErrorCode.AzureDevOpsSignInFailed;
            throw new DocsError(`Signing in with Azure DevOps failed: ${err.message}`, errorCode, err);
        }
    }

    private isSignInError(error: Error): boolean {
        if (error === undefined) {
            return false;
        }
        const errorCode = (<DocsError>error).code;
        return errorCode === ErrorCode.TriggerBuildBeforeSignIn || errorCode === ErrorCode.TriggerBuildWithCredentialExpired;
    }

    private resetSignInReason(): void {
        this._signInReason = undefined;
    }
}