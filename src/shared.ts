import vscode from 'vscode';
import { UriEventHandler } from './common/uriEventHandler';

// Extension
export const EXTENSION_NAME = 'docs-build';

export const EXTENSION_ID = `docsmsft.${EXTENSION_NAME}`;

export const EXTENSION_DIAGNOSTIC_SOURCE = 'Docs Validation';

export const INSTALL_DEPENDENCY_PACKAGE_RETRY_TIME = 3;

// Configuration
export const ENVIRONMENT_CONFIG_NAME = 'environment';

export const DEBUG_MODE_CONFIG_NAME = 'debugMode.enable';

export const SIGN_RECOMMEND_HINT_CONFIG_NAME = 'hint.signRecommend';

// Environment
export type Environment = 'PROD' | 'PPE';

export class MessageAction implements vscode.MessageItem {
    constructor(public title: string, public command?: string, public description?: string, public callback?: Function, public args?: any[]) { }
}

// Build
export const OP_CONFIG_FILE_NAME = '.openpublishing.publish.config.json';

// OAuth
export type DocsSignInStatus = 'Initializing' | 'SigningIn' | 'SignedIn' | 'SignedOut';

export type DocsRepoType = 'GitHub' | 'Azure DevOps';

export interface UserInfo {
    readonly signType: DocsRepoType;
    readonly userId: string;
    readonly userName: string;
    readonly userEmail: string;
    readonly userToken: string;
}

// Global variables
export const uriHandler = new UriEventHandler();

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