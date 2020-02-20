import vscode from 'vscode';
import fs from 'fs-extra';
import gitUrlParse from 'git-url-parse';
import simpleGit from 'simple-git/promise';
import uuid from 'uuid/v1';

export function parseQuery(uri: vscode.Uri) {
    return uri.query.split('&').reduce((prev: any, current) => {
        const queryString = current.split('=');
        prev[queryString[0]] = queryString[1];
        return prev;
    }, {});
}

export async function delay<T = void>(ms: number, result?: T) {
    return new Promise<T>((resolve, reject) => setTimeout(() => {
        if (result instanceof Error) {
            reject(result);
        } else {
            resolve(result);
        }
    }, ms));
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
        // If origin not existed, `origin` string will be return
        throw new Error('Cannot get remote `origin` of current repository');
    }

    let branch = await repository.revparse(['--abbrev-ref', 'HEAD']);

    let commit = await repository.revparse(['HEAD']);

    return [normalizeRemoteUrl(remote), branch, commit];
}

function normalizeRemoteUrl(url: string): string {
    const repository = gitUrlParse(url);
    return `https://${repository.resource}/${repository.full_name}`;
}

export function basicAuth(token: string) {
    let buff = Buffer.from(`user:${token}`);
    return buff.toString('base64');
}

export function formatDuration(ms: number) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}`;
}

export function getDurationInSeconds(ms: number) {
    return Math.floor(ms / 1000);
}

function pad(num: number, size: number) {
    let s = String(num);
    return s.padStart(size, '0');
}

export function trimEndSlash(str: string) {
    return str.replace(/\/*$/g, '');
}

export function getCorrelationId(): string {
    return uuid();
}