import fs from 'fs-extra';
import { AbsolutePathPackage, Package } from './package';
import { PlatformInformation } from '../common/platformInformation';
import { downloadFile } from './fileDownloader';
import { createInstallLockFile, InstallFileType, installFileExists, deleteInstallLockFile } from './dependencyHelper';
import { InstallZip } from './zipInstaller';
import { PlatformInfoRetrieved, DependencyInstallStarted, DependencyInstallCompleted, PackageInstallStarted, PackageInstallCompleted, PackageInstallError } from '../common/loggingEvents';
import { EventStream } from '../common/eventStream';
import { ExtensionContext } from '../extensionContext';
import { getDurationInSeconds } from '../utils/utils';
import { validateDownload } from './downloadValidator';

export async function ensureRuntimeDependencies(context: ExtensionContext, correlationId: string, platformInfo: PlatformInformation, eventStream: EventStream) {
    let runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
    let packagesToInstall = getAbsolutePathPackagesToInstall(runtimeDependencies, platformInfo, context.extensionPath);
    if (packagesToInstall && packagesToInstall.length > 0) {
        let start = Date.now();
        eventStream.post(new DependencyInstallStarted(correlationId));
        eventStream.post(new PlatformInfoRetrieved(platformInfo));

        let installDependencySucceeded = await installDependencies(correlationId, packagesToInstall, eventStream);
        eventStream.post(new DependencyInstallCompleted(correlationId, installDependencySucceeded, getDurationInSeconds(Date.now() - start)));
        return installDependencySucceeded;
    }

    return true;
}

function getAbsolutePathPackagesToInstall(packages: Package[], platformInfo: PlatformInformation, extensionPath: string) {
    if (packages && packages.length > 0) {
        let absolutePathPackages = packages.map(pkg => AbsolutePathPackage.getAbsolutePathPackage(pkg, extensionPath));
        return getNonInstalledPackagesForCurrentPlatform(absolutePathPackages, platformInfo);
    }
    return [];
}

async function installDependencies(correlationId: string, packages: AbsolutePathPackage[], eventStream: EventStream): Promise<boolean> {
    if (packages) {
        for (let pkg of packages) {
            eventStream.post(new PackageInstallStarted(pkg.description));
            fs.mkdirpSync(pkg.installPath.value);

            let retryCount = 0;
            let start = Date.now();
            while (retryCount < 3) {
                retryCount++;
                try {
                    // Create begin lock file
                    await createInstallLockFile(pkg.installPath, InstallFileType.Begin);

                    // Download file
                    let buffer = await downloadFile(pkg.description, pkg.url, eventStream);

                    // Check Integrity
                    await validateDownload(eventStream, buffer, pkg.integrity);

                    // Install zip file
                    await InstallZip(buffer, pkg.installPath, eventStream);

                    // Create Download finished lock
                    await createInstallLockFile(pkg.installPath, InstallFileType.Finish);

                    break;
                } catch (error) {
                    eventStream.post(new PackageInstallError(correlationId, pkg, retryCount, error));
                } finally {
                    // Remove download begin lock file 
                    if (installFileExists(pkg.installPath, InstallFileType.Begin)) {
                        deleteInstallLockFile(pkg.installPath, InstallFileType.Begin);
                    }
                }
            }

            let packageInstallSucceeded = installFileExists(pkg.installPath, InstallFileType.Finish);
            eventStream.post(new PackageInstallCompleted(correlationId, pkg, packageInstallSucceeded, retryCount - 1, getDurationInSeconds(Date.now() - start)));
            if (!packageInstallSucceeded) {
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
        throw new Error('Package manifest does not exist.');
    }
}

function filterInstalledPackages(packages: AbsolutePathPackage[]) {
    if (packages) {
        return packages.filter(pkg => {
            return !installFileExists(pkg.installPath, InstallFileType.Finish);
        });
    }
    else {
        throw new Error('Package manifest does not exist.');
    }
}