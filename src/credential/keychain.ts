import * as keytarType from 'keytar';
import { UserInfo } from '../common/shared';

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
const AAD_ACCOUNT_ID = 'docs-build-aad';
const USER_INFO_ACCOUNT_ID = 'docs-build-user-info';

class KeyChain {
    private keytar: Keytar;

    constructor() {
        this.keytar = getNodeModule<Keytar>('keytar') || failingKeytar;
    }

    public async getAADInfo(): Promise<string | undefined> {
        var aadInfo = await this.keytar.getPassword(SERVICE_ID, AAD_ACCOUNT_ID)
        if (aadInfo) {
            return aadInfo;
        }
        return undefined;
    }

    public async setAADInfo(aadInfo: string): Promise<void> {
        await this.keytar.setPassword(SERVICE_ID, AAD_ACCOUNT_ID, aadInfo);
    }

    public async getUserInfo(): Promise<UserInfo | null> {
        let userInfoStr = await this.keytar.getPassword(SERVICE_ID, USER_INFO_ACCOUNT_ID)
        if (userInfoStr == null) {
            return null;
        }
        return JSON.parse(userInfoStr);
    }

    public async setUserInfo(userInfo: UserInfo): Promise<void> {
        await this.keytar.setPassword(SERVICE_ID, USER_INFO_ACCOUNT_ID, JSON.stringify(userInfo));
    }

    public async deleteUserInfo(): Promise<void> {
        await this.keytar.deletePassword(SERVICE_ID, USER_INFO_ACCOUNT_ID);
    }
}

export const keyChain = new KeyChain();