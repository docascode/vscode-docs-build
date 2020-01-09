import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as gitUrlParse from 'git-url-parse';
import * as simpleGit from 'simple-git/promise';

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

export async function getRepositoryInfoFromLocalFolder(repositoryPath: string): Promise<string[]> {
    if (!fs.existsSync(repositoryPath)) {
        throw new Error(`Path(${repositoryPath}) is not existed on the current machine`);
    }
    let repository = simpleGit(repositoryPath);
    if (!(await repository.checkIsRepo())) {
        throw new Error(`Current workspace folder is not a valid git folder`);
    }

    let remote = (await repository.listRemote(['--get-url', 'origin'])).trim();
    if (remote === 'origin') {
        throw new Error('Cannot get remote `origin` of current repository');
    }

    let branch = await repository.revparse(['--abbrev-ref', 'HEAD']);
    if (branch === 'HEAD') {
        throw new Error('Please checkout to a branch');
    }

    return [normalizeRemoteUrl(remote), branch];
}

function normalizeRemoteUrl(url: string): string {
    const repository = gitUrlParse(url);
    return `https://${repository.resource}/${repository.full_name}`;
}