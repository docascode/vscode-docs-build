import * as vscode from 'vscode';
import * as fs from 'fs-extra';

export function openUrl(url: string): Thenable<boolean> {
    return vscode.env.openExternal(vscode.Uri.parse(url));
}

export function parseQuery(uri: vscode.Uri) {
    return uri.query.split('&').reduce((prev: any, current) => {
        const queryString = current.split('=');
        prev[queryString[0]] = queryString[1];
        return prev;
    }, {});
}

export async function delay<T = void>(ms: number, result?: T) {
    return new Promise<T>(resolve => setTimeout(() => resolve(result), ms));
}

export function safelyReadJsonFile(filePath: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`'${filePath}' is not existed`);
    }
    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }).replace(/^\uFEFF/, '').replace(/\u00A0/g, ' '));
}