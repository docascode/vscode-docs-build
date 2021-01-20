import fs from 'fs';
import https from 'https';

import { Package } from '../dependency/package';

interface PackageJSONFile {
    runtimeDependencies: Package[];
}

const DOCFX_PACKAGE_BLOB_URL = 'https://opsbuildk8sprod.blob.core.windows.net/docfx-bin';

export async function updateRuntimeDependencies(): Promise<void> {
    console.log(`Updating package dependencies...`);
    const packageJSON = <PackageJSONFile>JSON.parse(fs.readFileSync('package.json').toString());

    await updateDocFXPackages(packageJSON);

    fs.writeFileSync('package.json', JSON.stringify(packageJSON, undefined, 2));
    console.log(`Finished`);
}

async function updateDocFXPackages(packageJSON: PackageJSONFile): Promise<void> {
    const docfxVersion = process.env.DOCFX_VERSION;
    if(!docfxVersion){
        throw new Error(`Please specify DocFX version by environment variable 'DOCFX_VERSION'`);
    }
    console.log(`  Updating DocFX package to version '${docfxVersion}'`);

    const docfxPackages = packageJSON.runtimeDependencies.filter(dp => dp.name === 'docfx');

    for (const pkg of docfxPackages) {
        console.log(`    Updating package '${pkg.id}(${pkg.description})'...`);
        pkg.url = `${DOCFX_PACKAGE_BLOB_URL}/docfx-${pkg.rid}-${docfxVersion}.zip`;
        pkg.integrity = (await getFileFromURL(`${pkg.url}.sha256`)).trim();
    }
}

async function getFileFromURL(url: string): Promise<string> {
    let result = '';

    return new Promise<string>((resolve, reject) => {
        const request = https.request(url, response => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download from ${url} with error code '${response.statusCode}'`));
            }

            response.on('data', (chunk) => {
                result += chunk;
            });

            response.on('end', () => {
                try {
                    resolve(result);
                } catch (error) {
                    console.error(error.message);
                }
            });

            response.on('error', err => {
                reject(new Error(`Failed to download from ${url} with error message: ${err.message || 'NONE'}`));
            });
        });

        request.on('error', err => {
            reject(new Error(`Request error: ${err.message || 'NONE'}`));
        });

        request.end();
    });
}