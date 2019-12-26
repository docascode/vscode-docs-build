import * as fs from 'fs';
import * as https from 'https';
import { Package } from '../dependency/Package';

interface PackageJSONFile {
    runtimeDependencies: Package[];
}

const DOCFX_PACKAGE_BLOB_URL = "https://opsbuildk8sprod.blob.core.windows.net/docfx-bin";

export async function updateRuntimeDepenendencies(): Promise<void> {
    console.log(`Updating package dependencies...`);
    let packageJSON = <PackageJSONFile>JSON.parse(fs.readFileSync('package.json').toString());

    await updateDocFXPackages(packageJSON);

    fs.writeFileSync('package.json', JSON.stringify(packageJSON, undefined, 2));
    console.log(`Finished`);
}

async function updateDocFXPackages(packageJSON: PackageJSONFile): Promise<void> {
    const docfxVersion = process.env.DOCFX_VERSION;
    if(!docfxVersion){
        throw new Error(`Please specific the docfx version by environment variables 'DOCFX_VERSION'`);
    }
    console.log(`  Updating DocFX packages to version '${docfxVersion}'`);

    let docfxPackages = packageJSON.runtimeDependencies.filter(dp => dp.name === 'docfx');

    for (let pkg of docfxPackages) {
        console.log(`    Update Package '${pkg.id}(${pkg.description})'...`);
        pkg.url = `${DOCFX_PACKAGE_BLOB_URL}/docfx-${pkg.rid}-${docfxVersion}.zip`;
        pkg.integrity = (await getFileFromURL(`${pkg.url}.sha256`)).trim();
    }
}

async function getFileFromURL(url: string): Promise<string> {
    let result = '';

    return new Promise<string>((resolve, reject) => {
        let request = https.request(url, response => {
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download from ${url}. Error code '${response.statusCode}'`));
            }

            response.on("data", (chunk) => {
                result += chunk;
            });

            response.on("end", () => {
                try {
                    resolve(result);
                } catch (error) {
                    console.error(error.message);
                }
            });

            response.on('error', err => {
                reject(new Error(`Failed to download from ${url}. Error Message: ${err.message || 'NONE'}`));
            });
        });

        request.on('error', err => {
            reject(new Error(`Request error: ${err.message || 'NONE'}`));
        });

        request.end();
    });
}