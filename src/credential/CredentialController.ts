import * as vscode from 'vscode';
import { AzureEnvironment } from 'ms-rest-azure';
import * as template from 'url-template';
import { UserInfo, DocsSignInStatus, EXTENSION_ID, eventStream, environmentController, MessageAction, uriHandler } from '../common/shared';
import { keyChain } from './keyChain';
import { parseQuery, delay, openUrl } from '../utils/utils';
import { UserSigningIn, UserSignedIn, UserSignedOut, ResetUserInfo, SignInFailed, BaseEvent, LogProgress, FetchFromLocalCredentialManager } from '../common/loggingEvents';
import { EventType } from '../common/EventType';

const config = require('../../configs/vscode-docs-build.json');

async function handleAuthCallback(callback: (uri: vscode.Uri, resolve: (result: any) => void, reject: (reason: any) => void) => void): Promise<any> {
    let uriEventListener: vscode.Disposable;
    return Promise.race([
        delay(config.SignInTimeOut, undefined),
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
    readonly aadInfo: string;
    readonly userInfo: UserInfo;
}

export class CredentialController implements vscode.Disposable {
    private signInStatus: DocsSignInStatus;
    private aadInfo: string | undefined;
    private userInfo: UserInfo | undefined;

    public onDidChangeCredential: vscode.Event<Credential>;

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.RefreshCredential:
            case EventType.EnvironmentChange:
                this.refreshCredential();
                break;
            case EventType.CredentialExpiry:
                this.resetUserInfo();
                break;
        }
    }

    public dispose(): void {
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

    public async signIn(): Promise<void> {
        try {
            // Step-0: Start login
            this.resetUserInfo();
            this.signInStatus = 'SigningIn';
            eventStream.post(new UserSigningIn());

            // Step-1: AAD
            if (!this.aadInfo) {
                eventStream.post(new LogProgress(`Sign in to docs build with AAD...`, 'Sign In'));
                let aadInfo = await this.loginWithAAD();
                if (!aadInfo) {
                    this.resetUserInfo();
                    return;
                } else {
                    this.aadInfo = aadInfo;
                    keyChain.setAADInfo(aadInfo);
                }
            }

            // Step-2: Github login
            eventStream.post(new LogProgress(`Sign in to docs build with GitHub account...`, 'Sign In'));
            let userInfo = await this.loginWithGithub();
            if (!userInfo) {
                this.resetUserInfo();
                return;
            }

            this.signInStatus = 'SignedIn';
            this.userInfo = userInfo;
            await keyChain.setUserInfo(userInfo);
            eventStream.post(new UserSignedIn(this.credential, new MessageAction('Build', 'docs.build', 'Do you want to build Current workspace folder?')));
        } catch (err) {
            this.resetUserInfo();
            eventStream.post(new SignInFailed(err));
        }

    }

    public resetUserInfo() {
        keyChain.resetAADInfo();
        keyChain.resetUserInfo();
        this.signInStatus = 'SignedOut';
        this.aadInfo = undefined;
        this.userInfo = undefined;
        eventStream.post(new ResetUserInfo());
    }

    public signOut() {
        this.resetUserInfo();
        eventStream.post(new UserSignedOut());
    }

    private async refreshCredential(): Promise<void> {
        let userInfo = await keyChain.getUserInfo();
        let aadInfo = await keyChain.getAADInfo();
        if (userInfo && aadInfo) {
            this.signInStatus = 'SignedIn';
            this.userInfo = userInfo;
            this.aadInfo = aadInfo;
            eventStream.post(new FetchFromLocalCredentialManager(this.credential));
        } else {
            this.resetUserInfo();
        }
    }


    private async loginWithAAD(): Promise<string | undefined> {
        const authConfig = config.auth[environmentController.env.toString()];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${EXTENSION_ID}/aad-authenticate`));
        const signUrlTemplate = template.parse(`${AzureEnvironment.Azure.activeDirectoryEndpointUrl}/{tenantId}/oauth2/authorize` +
            '?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&response_mode=query&scope={scope}&state={state}&resource={resource}');
        const signUrl = signUrlTemplate.expand({
            tenantId: authConfig.AADAuthTenantId,
            clientId: authConfig.AADAuthClientId,
            redirectUri: authConfig.AADAuthRedirectUrl,
            scope: authConfig.AADAuthScope,
            state: callbackUri.with({ query: '' }).toString(),
            resource: authConfig.AADAuthResource
        });

        const uri = vscode.Uri.parse(signUrl);

        try {
            let opened = await vscode.env.openExternal(uri);
            if (opened) {
                return (await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: string) => void, reject: (reason: any) => void) => {
                    try {
                        // TODO: Adjust OP `Authorizations/aad` API to return the code.
                        const code = 'aad-code';

                        resolve(code);
                    } catch (err) {
                        reject(err);
                    }
                }));
            }
            eventStream.post(new SignInFailed(`Sign In with AAD Failed`));
            return undefined;
        } catch (err) {
            eventStream.post(new SignInFailed(`Sign In with AAD Failed: ${err.message}`));
            return undefined;
        }
    }

    private async loginWithGithub(): Promise<UserInfo | null> {
        const authConfig = config.auth[environmentController.env.toString()];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${EXTENSION_ID}/github-authenticate`));
        const state = callbackUri.with({ query: "" }).toString();
        const signUrlTemplate = template.parse(`https://github.com/login/oauth/authorize?client_id={clientId}&redirect_uri={redirect_uri}&scope={scope}&state={state}`);
        const signUrl = signUrlTemplate.expand({
            redirect_uri: `${authConfig.GitHubOauthRedirectUrl}/queryresponsemode`,
            clientId: authConfig.GitHubOauthClientId,
            scope: authConfig.GitHubOauthScope,
            state,
        });

        try {
            let opened = await openUrl(signUrl);
            if (opened) {
                return (await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: UserInfo) => void, reject: (reason: any) => void) => {
                    try {
                        const query = parseQuery(uri);

                        resolve({
                            userName: query.name,
                            userEmail: query.email,
                            userToken: query['X-OP-BuildUserToken'],
                            signType: 'Github'
                        });
                    } catch (err) {
                        reject(err);
                    }
                }));
            }
            eventStream.post(new SignInFailed(`Sign In with Github Failed`));
            return undefined;
        } catch (err) {
            eventStream.post(new SignInFailed(`Sign In with Github Failed: ${err.message}`));
            return undefined;
        }
    }
}