import * as crypto from 'crypto';
import * as https from 'https';
import { parse as parseUrl } from 'url';
import { DownloadStarted, DownloadSizeObtained, DownloadProgress, DownloadValidating, DownloadIntegrityCheckFailed } from '../common/loggingEvents';
import { EventStream } from '../common/eventStream';

export function downloadFile(description: string, urlString: string, eventStream: EventStream, integrity?: string, strictSSL = true): Promise<Buffer> {
    eventStream.post(new DownloadStarted(description));

    return downloadCore(urlString, eventStream, integrity, strictSSL);
}

function downloadCore(urlString: string, eventStream: EventStream, integrity?: string, strictSSL = true): Promise<Buffer> {
    const url = parseUrl(urlString);
    // TODO: Apply network settings(proxy, strictSSL..)
    const options: https.RequestOptions = {
        host: url.hostname,
        path: url.path,
        port: url.port,
        rejectUnauthorized: strictSSL
    };

    let buffers: any[] = [];

    return new Promise<Buffer>((resolve, reject) => {
        let request = https.request(options, response => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Redirect - download from new location
                return resolve(downloadCore(response.headers.location!, eventStream, integrity, strictSSL));
            }
            else if (response.statusCode !== 200) {
                // Download failed
                return reject(new Error(`Failed to download from ${urlString}. Error code '${response.statusCode}'`));
            }

            let packageSize = parseInt(response.headers['content-length']!, 10);
            let downloadedBytes = 0;
            let downloadPercentage = 0;

            eventStream.post(new DownloadSizeObtained(packageSize));

            response.on('data', data => {
                downloadedBytes += data.length;
                buffers.push(data);

                let newPercentage = Math.ceil(100 * (downloadedBytes / packageSize));
                if (newPercentage !== downloadPercentage) {
                    downloadPercentage = newPercentage;
                    eventStream.post(new DownloadProgress(downloadPercentage));
                }
            });

            response.on('end', () => {
                let buffer = Buffer.concat(buffers);
                if (integrity) {
                    eventStream.post(new DownloadValidating());
                    if (!isValidDownload(buffer, integrity)) {
                        eventStream.post(new DownloadIntegrityCheckFailed());
                        reject(new Error(`Failed integrity check.`));
                    }
                }
                resolve(buffer);
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