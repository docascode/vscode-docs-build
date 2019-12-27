import { AbsolutePath } from "../common/AbsolutePath";

export interface Package {
    id: string;
    name: string;
    description: string;
    url: string;
    rid: string;
    integrity: string;
    installPath?: string;
    binary: string;
}

export class AbsolutePathPackage {
    constructor(public id: string,
        public description: string,
        public url: string,
        public binary: string,
        public rid: string,
        public integrity: string,
        public installPath?: AbsolutePath) {
    }

    public static getAbsolutePathPackage(pkg: Package, extensionPath: string) {
        return new AbsolutePathPackage(
            pkg.id,
            pkg.description,
            pkg.url,
            pkg.binary,
            pkg.rid,
            pkg.integrity,
            getAbsoluteInstallPath(pkg, extensionPath)
        );
    }
}

function getAbsoluteInstallPath(pkg: Package, extensionPath: string): AbsolutePath {
    if (pkg.installPath) {
        return AbsolutePath.getAbsolutePath(extensionPath, pkg.installPath);
    }

    return new AbsolutePath(extensionPath);
} 