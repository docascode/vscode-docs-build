import fs from 'fs-extra';
import path from 'path';
import { execSync, ExecSyncOptions } from 'child_process';
import { rootPath, benchmarkTestAssetsPath } from './projectPaths';
import { basicAuth } from '../src/utils/utils';
import gitUrlParse = require('git-url-parse');

export function convertBenchmarkResultToMarkdown(result: any): string {
    let header = '|';
    let separator = '| ';
    let data = '|';
    Object.entries(result).forEach(([key, value]) => {
        header += ` ${key} |`;
        separator += ` --- |`;
        data += ` ${value} |`;
    });
    return `${header}\n${separator}\n${data}`;
}

export function downloadLatestTestRepo(repository: gitUrlParse.GitUrl, branch: string, token: string): void {
    const dest = path.join(benchmarkTestAssetsPath, repository.name);

    try {
        if (!fs.existsSync(path.join(dest, '.git'))) {
            fs.removeSync(dest);
            console.log(`Repository not exists, start to clone...`);
            execGit(`clone --single-branch --branch ${branch} ${repository.toString()}`, token, { cwd: benchmarkTestAssetsPath });
        } else {
            console.log(`Repository exists, start to get the latest content...`);
            execGit('clean -xfd', undefined, { cwd: dest });
            execGit('reset --hard', undefined, { cwd: dest });
            execGit(`pull origin ${branch} -f`, token, { cwd: dest });
        }
    } catch (err) {
        fs.removeSync(dest);
    }
}

function execGit(command: string, token?: string, options?: ExecSyncOptions): void {
    const optionsWithDefaultValue = <ExecSyncOptions>{
        cwd: rootPath,
        stdio: 'inherit',
        ...options
    };
    let githubBasicAuth = '';
    if (token) {
        githubBasicAuth = `-c http.https://github.com.extraheader="AUTHORIZATION: basic ${basicAuth(token)}"`;
    }
    console.log();
    console.log(`& git ${command}`);
    execSync(`git ${githubBasicAuth} ${command}`, optionsWithDefaultValue);
}