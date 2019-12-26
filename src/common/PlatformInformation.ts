import * as os from 'os';
const arch = require('arch');

export class PlatformInformation {
    public constructor(private platform: string, private architecture: string, public rid: string) { }

    public isWindows(): boolean {
        return this.platform === 'win32';
    }

    public isMacOS(): boolean {
        return this.platform === 'darwin';
    }

    public toString(): string {
        let result = `${this.rid} (${this.platform}`;

        if (this.architecture) {
            if (result) {
                result += ', ';
            }

            result += this.architecture;
        }
        result += ')';

        return result;
    }

    public static async getCurrent(): Promise<PlatformInformation> {
        let platform = os.platform();
        let architecture = arch();
        let rid: string;

        switch (platform) {
            case 'win32':
                rid = 'win-';
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