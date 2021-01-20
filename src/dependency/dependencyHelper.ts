import fs from 'fs-extra';
import path from 'path';

import { AbsolutePath } from '../common/absolutePath';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';

export enum InstallFileType {
    Begin = 'Begin',
    Finish = 'Finished'
}

export function getInstallLockFilePath(installFolderPath: AbsolutePath, installFileType: InstallFileType): string {
    const lockFileName = `install.lock.${installFileType}`;
    return path.resolve(installFolderPath.value, lockFileName);
}

export function installFileExists(installFolderPath: AbsolutePath, installFileType: InstallFileType): boolean {
    return fs.existsSync(getInstallLockFilePath(installFolderPath, installFileType));
}

export function deleteInstallLockFile(installFolderPath: AbsolutePath, installFileType: InstallFileType): void {
    fs.removeSync(getInstallLockFilePath(installFolderPath, installFileType));
}

export async function createInstallLockFile(installFolderPath: AbsolutePath, installFileType: InstallFileType, content = ''): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(getInstallLockFilePath(installFolderPath, installFileType), content, err => {
            if (err) {
                reject(new DocsError(`Failed to create ${installFileType} installation lock file`, ErrorCode.CreateInstallLockFileFailed));
                return;
            }

            resolve();
        });
    });
}