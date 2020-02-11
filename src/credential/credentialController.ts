import * as vscode from 'vscode';
import { AzureEnvironment } from 'ms-rest-azure';
import * as template from 'url-template';
import { UserInfo, DocsSignInStatus, EXTENSION_ID, uriHandler } from '../shared';
import extensionConfig from '../config';
import { parseQuery, delay, trimEndSlash } from '../utils/utils';
import { UserSignInSucceeded, UserSignOutSucceeded, CredentialReset, UserSignInFailed, BaseEvent, UserSignInProgress, CredentialRetrieveFromLocalCredentialManager, UserSignOutFailed, UserSignInTriggered, UserSignOutTriggered } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { EventStream } from '../common/eventStream';
import { KeyChain } from './keyChain';
import { EnvironmentController } from '../common/environmentController';
import { DocsError } from '../Errors/DocsError';
import { ErrorCode } from '../Errors/ErrorCode';
import { TimeOutError } from '../Errors/TimeOutError';

async function handleAuthCallback(callback: (uri: vscode.Uri, resolve: (result: any) => void, reject: (reason: any) => void) => void): Promise<any> {
    let uriEventListener: vscode.Disposable;
    return Promise.race([
        delay(extensionConfig.SignInTimeOut, new TimeOutError('Time out')),
        new Promise((resolve: (result: any) => void, reject: (reason: any) => void) => {
            uriEventListener = uriHandler.event((uri) => callback(uri, resolve, reject));
        }).then(result => {
            uriEventListener.dispose();
            return result;
        }).catch(err => {
            uriEventListener.dispose();
            return err;
        })
    ]);
}

export interface Credential {
    readonly signInStatus: DocsSignInStatus;
    readonly aadInfo: string;
    readonly userInfo: UserInfo;
}

export class CredentialController {
    private signInStatus: DocsSignInStatus;
    private aadInfo: string;
    private userInfo: UserInfo;

    constructor(private keyChain: KeyChain, private eventStream: EventStream, private environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.EnvironmentChanged:
            case EventType.RefreshCredential:
                this.initialize();
                break;
            case EventType.CredentialExpired:
                this.resetCredential();
                break;
        }
    }

    public async initialize(): Promise<void> {
        await this.refreshCredential();
    }

    public get credential(): Credential {
        return {
            signInStatus: this.signInStatus,
            aadInfo: this.aadInfo,
            userInfo: this.userInfo
        };
    }

    public async signIn(correlationId: string): Promise<void> {
        try {
            this.eventStream.post(new UserSignInTriggered(correlationId));
            this.resetCredential();
            this.signInStatus = 'SigningIn';

            // Step-1: AAD sign-in
            if (!this.aadInfo) {
                this.eventStream.post(new UserSignInProgress(`Sign-in to docs build with AAD...`, 'Sign-in'));
                let aadInfo = await this.signInWithAAD();

                this.aadInfo = aadInfo;
                this.keyChain.setAADInfo(aadInfo);
            }

            // Step-2: GitHub sign-in
            this.eventStream.post(new UserSignInProgress(`Sign-in to docs build with GitHub account...`, 'Sign-in'));
            let userInfo = await this.signInWithGitHub();

            this.signInStatus = 'SignedIn';
            this.userInfo = userInfo;
            await this.keyChain.setUserInfo(userInfo);
            this.eventStream.post(new UserSignInSucceeded(correlationId, this.credential));
        } catch (err) {
            this.resetCredential();
            this.eventStream.post(new UserSignInFailed(correlationId, err));
        }
    }

    public signOut(correlationId: string) {
        this.eventStream.post(new UserSignOutTriggered(correlationId));
        try {
            this.resetCredential();
            this.eventStream.post(new UserSignOutSucceeded(correlationId));
        } catch (err) {
            this.eventStream.post(new UserSignOutFailed(correlationId, err));
        }
    }

    private resetCredential() {
        this.keyChain.resetAADInfo();
        this.keyChain.resetUserInfo();
        this.signInStatus = 'SignedOut';
        this.aadInfo = undefined;
        this.userInfo = undefined;
        this.eventStream.post(new CredentialReset());
    }

    private async refreshCredential(): Promise<void> {
        let userInfo = await this.keyChain.getUserInfo();
        let aadInfo = await this.keyChain.getAADInfo();
        if (userInfo && aadInfo) {
            this.signInStatus = 'SignedIn';
            this.userInfo = userInfo;
            this.aadInfo = aadInfo;
            this.eventStream.post(new CredentialRetrieveFromLocalCredentialManager(this.credential));
        } else {
            this.resetCredential();
        }
    }

    private async signInWithAAD(): Promise<string> {
        const authConfig = extensionConfig.auth[this.environmentController.env];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${EXTENSION_ID}/aad-authenticate`));
        const signUrlTemplate = template.parse(`${trimEndSlash(AzureEnvironment.Azure.activeDirectoryEndpointUrl)}/{tenantId}/oauth2/authorize` +
            '?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&response_mode=query&scope={scope}&state={state}&resource={resource}');
        const signUrl = signUrlTemplate.expand({
            tenantId: authConfig.AADAuthTenantId,
            clientId: authConfig.AADAuthClientId,
            redirectUri: authConfig.AADAuthRedirectUrl,
            scope: authConfig.AADAuthScope,
            state: callbackUri.with({ query: '' }).toString(),
            resource: authConfig.AADAuthResource
        });


        let opened = await vscode.env.openExternal(vscode.Uri.parse(signUrl));
        if (!opened) {
            // User decline to open external URL to sign in
            throw new DocsError(`Sign-in with AAD Failed: Please Allow Code to open `, ErrorCode.AADSignInExternalUrlDeclined);
        }

        let result = await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: string) => void, reject: (reason: any) => void) => {
            try {
                // TODO: Adjust OP `Authorizations/aad` API to return the code.
                const code = 'aad-code';

                resolve(code);
            } catch (err) {
                reject(err);
            }
        });

        if (result instanceof Error) {
            if (result instanceof TimeOutError) {
                throw new DocsError(`Sign-in with AAD Failed: Time out`, ErrorCode.AADSignInTimeOut, result);
            }
            throw new DocsError(`Sign-in with AAD Failed: ${result.message}`, ErrorCode.AADSignInFailed, result);
        }
        return result;
    }

    private async signInWithGitHub(): Promise<UserInfo | null> {
        const authConfig = extensionConfig.auth[this.environmentController.env];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${EXTENSION_ID}/github-authenticate`));
        const state = callbackUri.with({ query: '' }).toString();
        const signUrlTemplate = template.parse(`https://github.com/login/oauth/authorize?client_id={clientId}&redirect_uri={redirect_uri}&scope={scope}&state={state}`);
        const signUrl = signUrlTemplate.expand({
            redirect_uri: `${authConfig.GitHubOauthRedirectUrl}/queryresponsemode`,
            clientId: authConfig.GitHubOauthClientId,
            scope: authConfig.GitHubOauthScope,
            state,
        });

        let opened = await vscode.env.openExternal(vscode.Uri.parse(signUrl));
        if (!opened) {
            // User decline to open external URL to sign in
            throw new DocsError(`Sign-in with GitHub Failed: Please Allow Code to open `, ErrorCode.GitHubSignInExternalUrlDeclined);
        }

        let result = await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: UserInfo) => void, reject: (reason: any) => void) => {
            try {
                const query = parseQuery(uri);

                resolve({
                    userName: query.name,
                    userEmail: query.email,
                    userToken: query['X-OP-BuildUserToken'],
                    signType: 'GitHub'
                });
            } catch (err) {
                reject(err);
            }
        });
        if (result instanceof Error) {
            let errorCode = result instanceof TimeOutError ? ErrorCode.GitHubSignInTimeOut : ErrorCode.GitHubSignInFailed;
            throw new DocsError(`Sign-in with GitHub Failed: ${result.message}`, errorCode, result);
        }
        return result;
    }
}