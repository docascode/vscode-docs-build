import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import * as yauzl from 'yauzl';
import { AbsolutePath } from '../common/AbsolutePath';
import { ZipFileInstalling } from '../common/loggingEvents';
import { EventStream } from '../common/EventStream';

export async function InstallZip(buffer: Buffer, destinationInstallPath: AbsolutePath, eventStream: EventStream): Promise<void> {
    eventStream.post(new ZipFileInstalling());

    return new Promise<void>((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipFile) => {
            if (err) {
                return reject(new Error(`Failed to install the zip file. Error code '${err.message}`));
            }

            zipFile.readEntry();

            zipFile.on('entry', (entry: yauzl.Entry) => {
                let absoluteEntryPath = path.resolve(destinationInstallPath.value, entry.fileName);

                if (entry.fileName.endsWith('/')) {
                    // Directory - create it
                    mkdirp(absoluteEntryPath, { mode: 0o775 }, (err) => {
                        if (err) {
                            return reject(new Error(`Error creating directory for zip directory entry: ${err.code || ''}`));
                        }

                        zipFile.readEntry();
                    });
                }
                else {
                    // File - extract it
                    zipFile.openReadStream(entry, (err, readStream) => {
                        if (err) {
                            return reject(new Error(`Error reading zip stream: ${err.message}`));
                        }

                        mkdirp(path.dirname(absoluteEntryPath), { mode: 0o775 }, err => {
                            if (err) {
                                return reject(new Error(`Error creating directory for zip file entry: ${err.message}`));
                            }

                            readStream.pipe(fs.createWriteStream(absoluteEntryPath, { mode: 0o775 }));
                            readStream.on('end', () => zipFile.readEntry());
                        });
                    });
                }
            });

            zipFile.on('end', () => {
                resolve();
            });

            zipFile.on('error', err => {
                reject(new Error(`Zip File Error: ${err.code || ''}`));
            });
        });
    });
}