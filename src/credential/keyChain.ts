import keytarType from 'keytar';
import { UserInfo } from '../shared';
import { EnvironmentController } from '../common/environmentController';

export type Keytar = {
    getPassword: typeof keytarType['getPassword'];
    setPassword: typeof keytarType['setPassword'];
    deletePassword: typeof keytarType['deletePassword'];
};

function getNodeModule<T>(moduleName: string): T {
    const vscodeRequire = eval('require');
    try {
        return vscodeRequire(moduleName);
    } catch (err) {
    }
    return undefined;
}

const failingKeytar: Keytar = {
    async getPassword(service, string) { throw new Error('System Keychain unavailable'); },
    async setPassword(service, string, password) { throw new Error('System Keychain unavailable'); },
    async deletePassword(service, string) { throw new Error('System Keychain unavailable'); }
};
const SERVICE_ID = 'vscode-docs-build';

export class KeyChain {
    private _keytar: Keytar;

    constructor(private _environmentController: EnvironmentController, overwriteKeytar?: Keytar) {
        this._keytar = overwriteKeytar || getNodeModule<Keytar>('keytar') || failingKeytar;
    }

    public async getUserInfo(): Promise<UserInfo | null> {
        const userInfoStr = await this._keytar.getPassword(SERVICE_ID, this.userInfoAccountId);
        if (userInfoStr) {
            return JSON.parse(userInfoStr);
        }
        return undefined;
    }

    public async setUserInfo(userInfo: UserInfo): Promise<void> {
        await this._keytar.setPassword(SERVICE_ID, this.userInfoAccountId, JSON.stringify(userInfo));
    }

    public async resetUserInfo(): Promise<void> {
        await this._keytar.deletePassword(SERVICE_ID, this.userInfoAccountId);
    }

    private get userInfoAccountId(): string {
        return `docs-build-user-info-${this._environmentController.env}-${this._environmentController.docsRepoType}`;
    }
}