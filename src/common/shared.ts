import * as vscode from 'vscode';

// Build
export interface DocsetInfo {
    BasePath: string,
    ProductName: string,
    SiteName: string
}

export type BuildEnv = 'PROD' | 'PPE';

export type BuildStatus = 'Building' | 'Ready';

export interface IExecError extends Error {
    action?: any;
}

// OAuth
export type DocsSignInStatus = 'Initializing' | 'SigningIn' | 'SignedIn' | 'SignedOut';

export type DocsSignInType = 'Github' | 'DevOps'

export interface UserInfo {
    readonly signType: DocsSignInType;
    readonly userName: string;
    readonly userEmail: string;
    readonly userToken: string;
}