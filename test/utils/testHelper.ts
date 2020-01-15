import * as vscode from 'vscode';
import { SinonSandbox } from 'sinon';
import ExtensionExports from '../../src/common/extensionExport';
import { EXTENSION_ID, UserInfo } from '../../src/shared';
import { KeyChain } from '../../src/credential/keyChain';

export async function ensureExtensionActivatedAndInitializationFinished(): Promise<vscode.Extension<ExtensionExports>> {
    const extension = vscode.extensions.getExtension<ExtensionExports>(EXTENSION_ID);

    if (!extension.isActive) {
        return undefined;
    }
    try {
        await extension.exports.initializationFinished();
    } catch (err) {
        console.log(JSON.stringify(err));
        return undefined;
    }
    return extension;
}

export function setupAvailableMockKeyChain(sinon: SinonSandbox, keyChain: KeyChain) {
    sinon.stub(keyChain, 'getAADInfo').resolves('fake-code');
    if (!process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN) {
        console.error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN" from environment variable');
    }

    sinon.stub(keyChain, 'getUserInfo').resolves(<UserInfo>{
        signType: 'GitHub',
        userName: 'VSC-Service-Account',
        userEmail: 'vscavu@microsoft.com',
        userToken: process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN
    });
}

export function setupUnavailableMockKeyChain(sinon: SinonSandbox, keyChain: KeyChain) {
    sinon.stub(keyChain, 'getAADInfo').resolves(undefined);
    sinon.stub(keyChain, 'getUserInfo').resolves(undefined);
}

export function triggerCommand(command: string) {
    vscode.commands.executeCommand(command);
}