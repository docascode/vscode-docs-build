import * as keytarType from 'keytar';
import { UserInfo } from '../common/shared';
import { environmentController } from '../build/environmentController';

type Keytar = {
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
    async getPassword(_service, _string) { throw new Error('System keyChain unavailable'); },
    async setPassword(_service, _string, _password) { throw new Error('System keyChain unavailable'); },
    async deletePassword(_service, _string) { throw new Error('System keyChain unavailable'); }
};
const SERVICE_ID = 'vscode-docs-build';

class KeyChain {
    private keytar: Keytar;

    constructor() {
        this.keytar = getNodeModule<Keytar>('keytar') || failingKeytar;
    }

    public async getAADInfo(): Promise<string | undefined> {
        var aadInfo = await this.keytar.getPassword(SERVICE_ID, this.AADAccountId)
        if (aadInfo) {
            return aadInfo;
        }
        return undefined;
    }

    public async getUserInfo(): Promise<UserInfo | null> {
        let userInfoStr = await this.keytar.getPassword(SERVICE_ID, this.userInfoAccountId)
        if (userInfoStr == null) {
            return null;
        }
        return JSON.parse(userInfoStr);
    }

    public async setAADInfo(aadInfo: string): Promise<void> {
        await this.keytar.setPassword(SERVICE_ID, this.AADAccountId, aadInfo);
    }

    public async setUserInfo(userInfo: UserInfo): Promise<void> {
        await this.keytar.setPassword(SERVICE_ID, this.userInfoAccountId, JSON.stringify(userInfo));
    }

    public async deleteUserInfo(): Promise<void> {
        await this.keytar.deletePassword(SERVICE_ID, this.userInfoAccountId);
    }

    public async deleteAADInfo(): Promise<void> {
        await this.keytar.deletePassword(SERVICE_ID, this.AADAccountId);
    }

    private get AADAccountId(): string {
        return `docs-build-aad-${environmentController.env}`;
    }

    private get userInfoAccountId(): string {
        return `docs-build-user-info-${environmentController.env}`;
    }
}

export const keyChain = new KeyChain();