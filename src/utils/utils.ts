import vscode from 'vscode';
import path from 'path';
import fs from 'fs-extra';
import gitUrlParse from 'git-url-parse';
import simpleGit from 'simple-git/promise';
import uuid from 'uuid/v1';
import du from 'du';
import psTree from 'ps-tree';
import { DocsRepoType } from '../shared';
import tempDirectory from 'temp-dir';

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
        throw new Error(`'${filePath}' does not exist`);
    }
    return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }).replace(/^\uFEFF/, '').replace(/\u00A0/g, ' '));
}

export async function getRepositoryInfoFromLocalFolder(repositoryPath: string): Promise<[DocsRepoType, string, string, string, string]> {
    if (!fs.existsSync(repositoryPath)) {
        throw new Error(`Path (${repositoryPath}) does not exist on the current machine`);
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

    const [docsRepoType, normalizedRepositoryUrl, locale] = parseRemoteUrl(remote);

    return [docsRepoType, normalizedRepositoryUrl, branch, commit, locale];
}

function parseRemoteUrl(url: string): [DocsRepoType, string, string] {
    const repository = gitUrlParse(url);
    const docsRepoType = repository.resource.startsWith('github.com') ? 'GitHub' : 'Azure DevOps';
    let match = /^.+?(?<locale>\.[a-z]{2,4}-[a-z]{2,4}(-[a-z]{2,4})?|\.loc)?$/g.exec(repository.name);
    let locale = 'en-us';
    if(match && match.groups && match.groups.locale) {
        locale = match.groups.locale.substring(1);
    }
    return [docsRepoType, `https://${repository.resource}/${repository.full_name}`, locale];
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

export async function getFolderSizeInMB(folderPath: string): Promise<number> {
    if (!fs.existsSync(folderPath)) {
        return 0;
    }

    let size = Math.floor(await du(folderPath) / 1024 / 1024);
    return size;
}

export async function killProcessTree(pid: number, signal?: string | number) {
    return new Promise((resolve, reject) => {
        signal = signal || 'SIGKILL';
        psTree(pid, function (err, children: psTree.PS[]) {
            if (err) {
                reject(err);
            } else {
                children.forEach((ps: psTree.PS) => {
                    process.kill(Number(ps.PID), signal);
                });
                resolve();
            }
        });
    });
}

export function getRandomOutputFolder() {
    let randomFolder = Math.random().toString(36).substring(7);
    return path.join(tempDirectory, randomFolder);
}

export function normalizeDriveLetter(filePath: string) {
    if (process.platform === 'win32') {
        return filePath.replace(/^([A-Z]):/, (match, driver) => `${driver.toLowerCase()}:`);
    } else {
        return filePath;
    }
}