import * as vscode from 'vscode';

// Build
export interface DocsetInfo {
    BasePath: string,
    ProductName: string,
    SiteName: string
}

export type BuildEnv = 'prod' | 'ppe';

export type BuildStatus = 'Building' | 'Ready';

export interface IExecError extends Error {
    action?: any;
}

// OAuth
export type DocsSignInStatus = 'Initializing' | 'SigningIn' | 'SignedIn' | 'SignedOut';

export type SignInType = 'Github' | 'DevOps'

export interface DocsAccount {
    status: DocsSignInStatus;
    onStatusChanged: vscode.Event<DocsAccount>;
    signInType: SignInType;
    aadInfo: string | undefined;
    userInfo: UserInfo | undefined;
}

export interface UserInfo {
    readonly userName: string;
    readonly userEmail: string;
    readonly userToken: string;
}