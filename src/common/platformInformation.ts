import os from 'os';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const arch = require('arch');

export class PlatformInformation {
    public constructor(private _platform: string, private _architecture: string, public rid: string) { }

    public isWindows(): boolean {
        return this._platform === 'win32';
    }

    public isMacOS(): boolean {
        return this._platform === 'darwin';
    }

    public toString(): string {
        let result = this._platform;

        if (this._architecture) {
            if (result) {
                result += ', ';
            }

            result += this._architecture;
        }

        return result;
    }

    public static async getCurrent(): Promise<PlatformInformation> {
        const platform = os.platform();
        const architecture = arch();
        let rid: string;

        switch (platform) {
            case 'win32':
                rid = 'win7-';
                break;

            case 'darwin':
                rid = 'osx-';
                break;

            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
        if (architecture !== 'x64') {
            throw new Error(`Unsupported architecture: ${architecture}(${platform})`);
        }
        rid += architecture;

        return new PlatformInformation(platform, architecture, rid);
    }
}