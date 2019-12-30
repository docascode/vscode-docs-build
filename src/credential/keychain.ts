import * as keytarType from 'keytar';
import { UserInfo } from '../common/shared';
import { EnvironmentController } from '../common/EnvironmentController';

export type Keytar = {
    getPassword: typeof keytarType['getPassword'];
    setPassword: typeof keytarType['setPassword'];
    deletePassword: typeof keytarType['deletePassword'];
};

function getNodeModule<T>(moduleName: string): T | undefined {
    const vscodeRequire = eval('require');
    try {
        return vscodeRequire(moduleName);
    } catch (err) {
    }
    return undefined;
}

const failingKeytar: Keytar = {
    async getPassword(service, string) { throw new Error('System keyChain unavailable'); },
    async setPassword(service, string, password) { throw new Error('System keyChain unavailable'); },
    async deletePassword(service, string) { throw new Error('System keyChain unavailable'); }
};
const SERVICE_ID = 'vscode-docs-build';

export class KeyChain {
    private keytar: Keytar;

    constructor(private environmentController: EnvironmentController, overwriteKeytar?: Keytar) {
        this.keytar = overwriteKeytar || getNodeModule<Keytar>('keytar') || failingKeytar;
    }

    public async getAADInfo(): Promise<string | undefined> {
        let aadInfo = await this.keytar.getPassword(SERVICE_ID, this.AADAccountId);
        if (aadInfo) {
            return aadInfo;
        }
        return undefined;
    }

    public async getUserInfo(): Promise<UserInfo | null> {
        let userInfoStr = await this.keytar.getPassword(SERVICE_ID, this.userInfoAccountId);
        if (userInfoStr) {
            return JSON.parse(userInfoStr);
        }
        return undefined;
    }

    public async setAADInfo(aadInfo: string): Promise<void> {
        await this.keytar.setPassword(SERVICE_ID, this.AADAccountId, aadInfo);
    }

    public async setUserInfo(userInfo: UserInfo): Promise<void> {
        await this.keytar.setPassword(SERVICE_ID, this.userInfoAccountId, JSON.stringify(userInfo));
    }

    public async resetUserInfo(): Promise<void> {
        await this.keytar.deletePassword(SERVICE_ID, this.userInfoAccountId);
    }

    public async resetAADInfo(): Promise<void> {
        await this.keytar.deletePassword(SERVICE_ID, this.AADAccountId);
    }

    private get AADAccountId(): string {
        return `docs-build-aad-${this.environmentController.env}`;
    }

    private get userInfoAccountId(): string {
        return `docs-build-user-info-${this.environmentController.env}`;
    }
}