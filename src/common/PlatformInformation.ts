import * as os from 'os';
import { executeCommandSync } from './cpUtils';

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

    public static async GetCurrent(): Promise<PlatformInformation> {
        let platform = os.platform();
        let architecture: string;
        let rid: string;

        switch (platform) {
            case 'win32':
                architecture = await PlatformInformation.GetWindowsArchitecture();
                rid = 'win-';
                break;

            case 'darwin':
                architecture = await PlatformInformation.GetUnixArchitecture();
                rid = 'osx-';
                break;

            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
        if (architecture === 'x86') {
            throw new Error(`Unsupported architecture: ${architecture}(${platform})`);
        }
        rid += architecture;

        return new PlatformInformation(platform, architecture, rid);
    }

    private static async GetWindowsArchitecture(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            if (process.env.PROCESSOR_ARCHITECTURE === 'x86' && process.env.PROCESSOR_ARCHITEW6432 === undefined) {
                resolve('x86');
            }
            else {
                resolve('x64');
            }
        });
    }

    private static async GetUnixArchitecture(): Promise<string> {
        try {
            let architecture = executeCommandSync('uname', ['-m']);
            return architecture.trim();
        } catch {
            return null;
        }
    }
}