import * as vscode from 'vscode';
import { UriEventHandler } from './UriEventHandler';

// Extension
export const EXTENSION_NAME = 'docs-build';

export const EXTENSION_ID = `ceapex.${EXTENSION_NAME}`;

const extension = vscode.extensions.getExtension(EXTENSION_ID);

export const PACKAGE_JSON = extension.packageJSON;

export const EXTENSION_PATH = extension.extensionPath;

// Environment

export type Environment = 'PROD' | 'PPE';

export class MessageAction implements vscode.MessageItem {
    constructor(public title: string, public command?: string, public description?: string, public callback?: Function, public args?: any[]) { }
}

// OAuth
export type DocsSignInStatus = 'Initializing' | 'SigningIn' | 'SignedIn' | 'SignedOut';

export type DocsSignInType = 'GitHub' | 'Azure DevOps';

export interface UserInfo {
    readonly signType: DocsSignInType;
    readonly userName: string;
    readonly userEmail: string;
    readonly userToken: string;
}

// Global variables
export const uriHandler = new UriEventHandler();

export const extensionConfig = require('../../../configs/vscode-docs-build.json');