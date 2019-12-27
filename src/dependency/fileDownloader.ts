import * as crypto from "crypto";
import * as https from 'https';
import { docsChannel } from '../common/shared';
import { parse as parseUrl } from 'url';

export async function downloadFile(description: string, urlString: string, integrity: string): Promise<Buffer> {
    docsChannel.append(`Downloading package '${description}' `);

    const url = parseUrl(urlString);
    // TODO: Apply network settings(proxy, strictSSL..)
    const options: https.RequestOptions = {
        host: url.hostname,
        path: url.path,
        port: url.port
    };

    let buffers: any[] = [];

    return new Promise<Buffer>((resolve, reject) => {
        let request = https.request(options, response => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Redirect - download from new location
                return resolve(downloadFile(description, response.headers.location!, integrity));
            }
            else if (response.statusCode !== 200) {
                // Download failed
                return reject(new Error(`Failed to download from ${urlString}. Error code '${response.statusCode}'`));
            }

            let packageSize = parseInt(response.headers['content-length']!, 10);
            let downloadedBytes = 0;
            let downloadPercentage = 0;

            docsChannel.append(`(${Math.ceil(packageSize / 1024)} KB) `);

            response.on('data', data => {
                downloadedBytes += data.length;
                buffers.push(data);

                let newPercentage = Math.ceil(100 * (downloadedBytes / packageSize) / 5);
                if (newPercentage !== downloadPercentage) {
                    downloadPercentage = newPercentage;
                    docsChannel.append('.');
                }
            });

            response.on('end', () => {
                docsChannel.appendLine(` Done!`);
                let buffer = Buffer.concat(buffers);
                docsChannel.appendLine('Validating download...');
                if (isValidDownload(buffer, integrity)) {
                    resolve(buffer);
                } else {
                    reject(new Error(`Failed integrity check.`));
                }
            });

            response.on('error', err => {
                reject(new Error(`Failed to download from ${urlString}. Error Message: ${err.message || 'NONE'}`));
            });
        });

        request.on('error', err => {
            reject(new Error(`Request error: ${err.message || 'NONE'}`));
        });

        request.end();
    });
}

function isValidDownload(buffer: Buffer, integrity: string) {
    if (integrity && integrity.length > 0) {
        let downloadFileIntegrity = getBufferIntegrityHash(buffer);
        return downloadFileIntegrity === integrity.toUpperCase();
    }
    return true;
}

function getBufferIntegrityHash(buffer: Buffer): string {
    let hash = crypto.createHash('sha256');
    hash.update(buffer);
    let value = hash.digest('hex').toUpperCase();
    return value;
}