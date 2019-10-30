import * as vscode from 'vscode';
import * as uuid from 'uuid';
import { AzureEnvironment } from 'ms-rest-azure';
import * as template from 'url-template';
import { DocsAccount, BuildEnv, UserInfo } from '../common/shared';
import { keyChain } from './keyChain';
import { parseQuery, delay, openUrl } from '../common/utility';
import { uriHandler } from '../common/uri';
const config = require('../../configs/vscode-docs-build.json');

async function handleAuthCallback(callback: (uri: vscode.Uri, resolve: (result: any) => void, reject: (reason: any) => void) => void): Promise<any> {
    let uriEventListener: vscode.Disposable;
    return Promise.race([
        delay(120000, null),
        new Promise((resolve: (result: any) => void, reject: (reason: any) => void) => {
            uriEventListener = uriHandler.event((uri) => callback(uri, resolve, reject))
        }).then(result => {
            uriEventListener.dispose()
            return result;
        }).catch(err => {
            uriEventListener.dispose();
            throw err;
        })
    ])
}

class CredentialController implements vscode.Disposable {
    private didChange: vscode.EventEmitter<DocsAccount> = new vscode.EventEmitter<DocsAccount>();
    private authConfig: any;

    account: DocsAccount = {
        status: 'Initializing',
        onStatusChanged: this.didChange.event,
        signInType: 'Github',
        aadInfo: undefined,
        userInfo: undefined
    }

    constructor(buildEnv: BuildEnv = 'ppe') {
        this.authConfig = config.auth[buildEnv.toString()]
    }

    public async initialize(): Promise<void> {
        var userInfo = await keyChain.getUserInfo();
        if (userInfo) {
            this.account.status = 'SignedIn';
            this.account.userInfo = userInfo
        } else {
            this.account.status = 'SignedOut';
        }

        this.account.aadInfo = await keyChain.getAADInfo();
        this.didChange.fire(this.account);
    }

    public async signIn(): Promise<void> {
        try {
            // Step-0: Start login
            this.resetUserInfo();
            this.account.status = 'SigningIn';
            this.didChange.fire(this.account);

            // Step-1: AAD
            if (!this.account.aadInfo) {
                var aadInfo = await this.loginWithAAD();
                if (!aadInfo) {
                    vscode.window.showWarningMessage('[Docs Build] Login with AAD failed');
                    this.account.status = 'SignedOut';
                    return;
                } else{
                    this.account.aadInfo = aadInfo;
                    keyChain.setAADInfo(aadInfo);
                }
            }

            // Step-2: Github login
            let userInfo = await this.loginWithGithub();
            if (!userInfo) {
                vscode.window.showWarningMessage('[Docs Build] Login with Github failed');
                this.account.status = 'SignedOut';
                return;
            }

            this.account.status = 'SignedIn';
            this.account.userInfo = userInfo;

            await keyChain.setUserInfo(userInfo);
        } catch (err) {
            vscode.window.showWarningMessage(`[Docs Build] SignIn failed: ${err}`);
            this.resetUserInfo();
        } finally {
            this.didChange.fire(this.account);
        }

    }

    public resetUserInfo() {
        keyChain.deleteUserInfo();
        keyChain.deleteAADInfo();
        this.account.status = 'SignedOut';
        this.account.aadInfo = undefined;
        this.account.userInfo = undefined;
    }

    public signOut() {
        this.resetUserInfo();
        this.didChange.fire(this.account);
    }

    private async loginWithAAD(): Promise<string | undefined> {
        const callbackUri = (await vscode.env.createAppUri({ payload: { path: '/aad-authenticate' } }));
        const signUrlTemplate = template.parse(`${AzureEnvironment.Azure.activeDirectoryEndpointUrl}/{tenantId}/oauth2/authorize` +
            '?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&response_mode=query&scope={scope}&state={state}&resource={resource}');
        const signUrl = signUrlTemplate.expand({
            tenantId: this.authConfig.AADAuthTenantId,
            clientId: this.authConfig.AADAuthClientId,
            redirectUri: this.authConfig.AADAuthRedirectUrl,
            scope: this.authConfig.AADAuthScope,
            state: callbackUri.with({ query: '' }).toString(),
            resource: this.authConfig.AADAuthResource
        })

        const uri = vscode.Uri.parse(signUrl);
        console.info('AAD OAuth: ' + uri.toString());

        try {
            var opened = await vscode.env.openExternal(uri);
            if (opened) {
                var code = (await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: string) => void, reject: (reason: any) => void) => {
                    try {
                        // const query = parseQuery(uri);
                        // const code = query.code;
                        const code = 'fake-code';

                        // if (query.state !== state) {
                        //     throw new Error('Login with GitHub failed: State does not match.');
                        // }

                        resolve(code);
                    } catch (err) {
                        reject(err);
                    }
                }));

                return code;
            }
            return undefined;
        } catch (err) {
            return undefined;
        }
    }

    private async loginWithGithub(): Promise<UserInfo | null> {
        const callbackUri = await vscode.env.createAppUri({ payload: { path: '/github-authenticate' } });
        const state = callbackUri.with({ query: "" }).toString();
        const signUrlTemplate = template.parse(`https://github.com/login/oauth/authorize?client_id={clientId}&redirect_uri={redirect_uri}&scope={scope}&state={state}`);
        const signUrl = signUrlTemplate.expand({
            // redirect_uri: `${this.authConfig.GitHubOauthRedirectUrl}?response_mode=query`,
            redirect_uri: `${this.authConfig.GitHubOauthRedirectUrl}/queryresponsemode`,
            clientId: this.authConfig.GitHubOauthClientId,
            scope: this.authConfig.GitHubOauthScope,
            state,
        })
        console.info("github OAuth: " + signUrl.toString());

        try {
            var opened = await openUrl(signUrl);
            if (opened) {
                return (await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: UserInfo) => void, reject: (reason: any) => void) => {
                    try {
                        const query = parseQuery(uri);

                        resolve({
                            userName: query.name,
                            userEmail: query.email,
                            userToken: query['X-OP-BuildUserToken']
                        });
                    } catch (err) {
                        reject(err);
                    }
                }));
            }
            return null;
        } catch (err) {
            return null;
        }
    }

    public dispose(): void {
        this.didChange.dispose();
    }
}

export const credentialController = new CredentialController();