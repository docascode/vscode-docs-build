import * as path from 'path';
import { AbsolutePath } from "../common/AbsolutePath";
import * as fs from 'fs-extra';

export enum InstallFileType {
    Begin,
    Finish
}

export function getInstallLockFilePath(installFolderPath: AbsolutePath, installFileType: InstallFileType): string {
    let lockFileName = `install.lock.${InstallFileType[installFileType]}`;
    return path.resolve(installFolderPath.value, lockFileName);
}

export function installFileExists(installFolderPath: AbsolutePath, installFileType: InstallFileType): boolean {
    return fs.existsSync(getInstallLockFilePath(installFolderPath, installFileType));
}

export function deleteInstallLockFile(installFolderPath: AbsolutePath, installFileType: InstallFileType): void {
    fs.removeSync(getInstallLockFilePath(installFolderPath, installFileType));
}

export async function createInstallLockFile(installFolderPath: AbsolutePath, installFileType: InstallFileType): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile(getInstallLockFilePath(installFolderPath, installFileType), '', err => {
            if (err) {
                reject(err);
                return;
            }

            resolve();
        });
    });
}