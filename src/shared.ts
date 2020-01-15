import * as vscode from 'vscode';
import { UriEventHandler } from './common/UriEventHandler';

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

// Build
export const OUTPUT_FOLDER_NAME = '_site';

export const OP_CONFIG_FILE_NAME = '.openpublishing.publish.config.json';

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

export const extensionConfig = require('../../configs/vscode-docs-build.json');

// Test only
export interface BenchmarkReport {
    name: string;
    url: string;
    branch: string;
    commit: string;
    items: ReportItem[];
}

export interface ReportItem {
    totalDuration: number;
    restoreDuration: number;
    buildDuration: number;
    isInitialRun: boolean;
}