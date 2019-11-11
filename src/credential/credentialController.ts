import * as vscode from 'vscode';
import { AzureEnvironment } from 'ms-rest-azure';
import * as template from 'url-template';
import { BuildEnv, UserInfo, DocsSignInStatus } from '../common/shared';
import { keyChain } from './keyChain';
import { parseQuery, delay, openUrl, getExtensionId } from '../common/utility';
import { uriHandler } from '../common/uri';
import { docsChannel } from '../common/docsChannel';
import { environmentController } from '../build/environmentController';

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
    private _didChange: vscode.EventEmitter<void>;
    private _signInStatus: DocsSignInStatus;
    private _aadInfo: string | undefined;
    private _userInfo: UserInfo | undefined;
    private _environmentChangeListener: vscode.Disposable;

    public onDidChangeCredential: vscode.Event<void>;

    constructor() {
        this._didChange = new vscode.EventEmitter<void>();
        this._environmentChangeListener = environmentController.onDidChange(async (env: BuildEnv) => {
            await this.refreshCredential();
        })

        this.onDidChangeCredential = this._didChange.event;
    }

    public async initialize():Promise<void>{
        await this.refreshCredential();
    }

    public get signInStatus(): DocsSignInStatus {
        return this._signInStatus;
    }

    public get aadInfo(): string | undefined {
        return this._aadInfo;
    }

    public get userInfo(): UserInfo | undefined {
        return this._userInfo;
    }

    public async signIn(): Promise<void> {
        try {
            // Step-0: Start login
            this.resetUserInfo();
            this._signInStatus = 'SigningIn';
            this._didChange.fire();
            docsChannel.show();

            // Step-1: AAD
            if (!this._aadInfo) {
                docsChannel.appendLine(`[Docs Sign] Sign in to docs build with AAD...`);
                var aadInfo = await this.loginWithAAD();
                if (!aadInfo) {
                    vscode.window.showWarningMessage('[Docs Build] Login with AAD failed');
                    this._signInStatus = 'SignedOut';
                    return;
                } else {
                    this._aadInfo = aadInfo;
                    keyChain.setAADInfo(aadInfo);
                }
            }

            // Step-2: Github login
            docsChannel.appendLine(`[Docs Sign] Sign in to docs build with GitHub account...`);
            let userInfo = await this.loginWithGithub();
            if (!userInfo) {
                vscode.window.showWarningMessage('[Docs Build] Login with Github failed');
                this._signInStatus = 'SignedOut';
                return;
            }

            docsChannel.appendLine(`[Docs Sign] Successfully sign in to Docs build system:`);
            docsChannel.appendLine(`    - Github Acount: ${userInfo.userName}`);
            docsChannel.appendLine(`    - User email   : ${userInfo.userEmail}`);

            this._signInStatus = 'SignedIn';
            this._userInfo = userInfo;

            await keyChain.setUserInfo(userInfo);
        } catch (err) {
            vscode.window.showWarningMessage(`[Docs Build] SignIn failed: ${err}`);
            this.resetUserInfo();
        } finally {
            this._didChange.fire();
        }

    }

    public resetUserInfo() {
        keyChain.deleteUserInfo();
        keyChain.deleteAADInfo();
        this._signInStatus = 'SignedOut';
        this._aadInfo = undefined;
        this._userInfo = undefined;
    }

    public signOut() {
        docsChannel.appendLine(`[Docs Sign] Successfully sign out from Docs build system`);
        this.resetUserInfo();
        this._didChange.fire();
    }

    public dispose(): void {
        this._didChange.dispose();
        this._environmentChangeListener.dispose();
    }

    private async refreshCredential(): Promise<void> {
        var userInfo = await keyChain.getUserInfo();
        if (userInfo) {
            this._signInStatus = 'SignedIn';
            this._userInfo = userInfo;
        } else {
            this._signInStatus = 'SignedOut';
        }

        this._aadInfo = await keyChain.getAADInfo();
        this._didChange.fire();
    }


    private async loginWithAAD(): Promise<string | undefined> {
        const authConfig = config.auth[environmentController.env.toString()];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${getExtensionId()}/aad-authenticate`));
        const signUrlTemplate = template.parse(`${AzureEnvironment.Azure.activeDirectoryEndpointUrl}/{tenantId}/oauth2/authorize` +
            '?client_id={clientId}&response_type=code&redirect_uri={redirectUri}&response_mode=query&scope={scope}&state={state}&resource={resource}');
        const signUrl = signUrlTemplate.expand({
            tenantId: authConfig.AADAuthTenantId,
            clientId: authConfig.AADAuthClientId,
            redirectUri: authConfig.AADAuthRedirectUrl,
            scope: authConfig.AADAuthScope,
            state: callbackUri.with({ query: '' }).toString(),
            resource: authConfig.AADAuthResource
        })

        const uri = vscode.Uri.parse(signUrl);
        console.info('AAD OAuth: ' + uri.toString());

        try {
            var opened = await vscode.env.openExternal(uri);
            if (opened) {
                var code = (await handleAuthCallback(async (uri: vscode.Uri, resolve: (result: string) => void, reject: (reason: any) => void) => {
                    try {
                        // TODO: add adjust OP `Authorizations/aad` API to return the code and expiry time of AAD token.

                        // const query = parseQuery(uri);
                        // const code = query.code;
                        const code = 'fake-code';

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
        const authConfig = config.auth[environmentController.env.toString()];
        const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://${getExtensionId()}/github-authenticate`));
        const state = callbackUri.with({ query: "" }).toString();
        const signUrlTemplate = template.parse(`https://github.com/login/oauth/authorize?client_id={clientId}&redirect_uri={redirect_uri}&scope={scope}&state={state}`);
        const signUrl = signUrlTemplate.expand({
            // redirect_uri: `${this.authConfig.GitHubOauthRedirectUrl}?response_mode=query`,
            redirect_uri: `${authConfig.GitHubOauthRedirectUrl}/queryresponsemode`,
            clientId: authConfig.GitHubOauthClientId,
            scope: authConfig.GitHubOauthScope,
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
                            userToken: query['X-OP-BuildUserToken'],
                            signType: 'Github'
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
}

export const credentialController = new CredentialController();