import https from 'https';
import { URL } from 'url';

import { EventStream } from '../common/eventStream';
import { DownloadProgress,DownloadSizeObtained, DownloadStarted } from '../common/loggingEvents';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';

export async function downloadFile(description: string, urlString: string, eventStream: EventStream, strictSSL = true): Promise<Buffer> {
    eventStream.post(new DownloadStarted(description));

    return await downloadCore(urlString, eventStream, strictSSL);
}

async function downloadCore(urlString: string, eventStream: EventStream, strictSSL = true): Promise<Buffer> {
    const url = new URL(urlString);
    // TODO: Apply network settings(proxy, strictSSL..)
    const options: https.RequestOptions = {
        host: url.hostname,
        path: `${url.pathname}${url.search}`,
        port: url.port,
        rejectUnauthorized: strictSSL
    };

    const buffers: any[] = [];

    try {
        return await new Promise<Buffer>((resolve, reject) => {
            const request = https.request(options, response => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    // Redirect - download from new location
                    return resolve(downloadCore(response.headers.location!, eventStream, strictSSL));
                }
                else if (response.statusCode !== 200) {
                    // Download failed
                    return reject(new Error(`Invalid status code (${response.statusCode})`));
                }

                const packageSize = parseInt(response.headers['content-length']!, 10);
                let downloadedBytes = 0;
                let downloadPercentage = 0;

                eventStream.post(new DownloadSizeObtained(packageSize));

                response.on('data', data => {
                    downloadedBytes += data.length;
                    buffers.push(data);

                    const newPercentage = Math.ceil(100 * (downloadedBytes / packageSize));
                    if (newPercentage !== downloadPercentage) {
                        downloadPercentage = newPercentage;
                        eventStream.post(new DownloadProgress(downloadPercentage));
                    }
                });

                response.on('end', () => {
                    const buffer = Buffer.concat(buffers);
                    resolve(buffer);
                });

                response.on('error', err => {
                    reject(new Error(`Response error (${err.message || 'NONE'})`));
                });
            });

            request.on('error', err => {
                reject(new Error(`Request error (${err.message || 'NONE'})`));
            });

            request.end();
        });
    } catch (err) {
        throw new DocsError(`Failed to download from '${urlString}': ${err.message}`, ErrorCode.DownloadFileFailed, err);
    }
}