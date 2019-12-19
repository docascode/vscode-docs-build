import * as fs from 'fs-extra';
import { AbsolutePathPackage, Package } from "./Package";
import { PACKAGE_JSON, EXTENSION_PATH } from "../common/shared";
import { PlatformInformation } from "../common/PlatformInformation";
import { docsChannel } from "../common/shared";
import { downloadFile } from './fileDownloader';
import { createInstallLockFile, InstallFileType, installFileExists, deleteInstallLockFile } from './dependencyHelper';
import { InstallZip } from './zipInstaller';

export async function ensureRuntimeDependencies(platformInfo: PlatformInformation) {
    let runtimeDependencies = <Package[]>PACKAGE_JSON.runtimeDependencies;
    let packagesToInstall = getAbsolutePathPackagesToInstall(runtimeDependencies, platformInfo, EXTENSION_PATH);
    if (packagesToInstall && packagesToInstall.length > 0) {
        docsChannel.show();
        docsChannel.appendLine(`Installing runtime dependencies...`);
        docsChannel.appendLine(`Platform: '${platformInfo.toString()}'`);

        if (await installDependencies(packagesToInstall)) {
            docsChannel.appendLine();
            docsChannel.appendLine('Runtime dependencies installation finished');
            return true;
        }
        return false;
    }

    docsChannel.appendLine('Runtime dependencies installed');
    return true;
}

function getAbsolutePathPackagesToInstall(packages: Package[], platformInfo: PlatformInformation, extensionPath: string) {
    if (packages && packages.length > 0) {
        let absolutePathPackages = packages.map(pkg => AbsolutePathPackage.getAbsolutePathPackage(pkg, extensionPath));
        return getNonInstalledPackagesForCurrentPlatform(absolutePathPackages, platformInfo);
    }
    return [];
}

async function installDependencies(packages: AbsolutePathPackage[]): Promise<boolean> {
    if (packages) {
        for (let pkg of packages) {
            docsChannel.appendLine();
            docsChannel.appendLine(`Installing package '${pkg.description}'...`);

            fs.mkdirpSync(pkg.installPath.value);

            let count = 1;
            while (count <= 3) {
                count++;

                try {
                    // Create begin lock file
                    await createInstallLockFile(pkg.installPath, InstallFileType.Begin);

                    // Download file
                    let buffer = await downloadFile(pkg.description, pkg.url, pkg.integrity);

                    // Install zip file
                    await InstallZip(buffer, pkg.description, pkg.installPath);

                    // Create Download finished lock
                    await createInstallLockFile(pkg.installPath, InstallFileType.Finish);

                    break;
                } catch (error) {
                    docsChannel.appendLine(`Failed to install package '${pkg.description}': ${error.message}${count <= 3 ? '. Will retry' : ''}`);
                } finally {
                    // Remove download begin lock file 
                    if (installFileExists(pkg.installPath, InstallFileType.Begin)) {
                        deleteInstallLockFile(pkg.installPath, InstallFileType.Begin);
                    }
                }
            }

            if (installFileExists(pkg.installPath, InstallFileType.Finish)) {
                docsChannel.appendLine(`Package '${pkg.description}' installed!`);
            } else {
                return false;
            }
        }
    }
    return true;
}

function getNonInstalledPackagesForCurrentPlatform(absolutePathPackages: AbsolutePathPackage[], platformInfo: PlatformInformation) {
    let packagesForCurrentPlatform = getPackagesForCurrentPlatform(absolutePathPackages, platformInfo);
    return filterInstalledPackages(packagesForCurrentPlatform);
}

function getPackagesForCurrentPlatform(packages: AbsolutePathPackage[], platformInfo: PlatformInformation) {
    if (packages) {
        return packages.filter(pkg => pkg.rid === platformInfo.rid);
    }
    else {
        throw new Error("Package manifest does not exist.");
    }
}

function filterInstalledPackages(packages: AbsolutePathPackage[]) {
    if (packages) {
        return packages.filter(pkg => {
            return !installFileExists(pkg.installPath, InstallFileType.Finish);
        });
    }
    else {
        throw new Error("Package manifest does not exist.");
    }
}