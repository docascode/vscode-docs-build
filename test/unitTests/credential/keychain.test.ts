import assert from 'assert';
import { KeyChain, Keytar } from '../../../src/credential/keyChain';
import { UserInfo } from '../../../src/shared';
import { getFakeEnvironmentController, setEnvToPROD, setEnvToPPE } from '../../utils/faker';
import { EnvironmentController } from '../../../src/common/environmentController';

class MockKeytar implements Keytar {
    map = new Map;

    async getPassword(service: string, account: string) {
        return this.map.get(account);
    }

    async setPassword(service: string, account: string, password: string) {
        this.map.set(account, password);
    }

    async deletePassword(service: string, account: string) {
        return this.map.delete(account);
    }
}

describe('KeyChain', () => {
    let environmentController: EnvironmentController;
    let keyChain: KeyChain;

    before(() => {
        environmentController = getFakeEnvironmentController();
    });

    beforeEach(() => {
        keyChain = new KeyChain(environmentController, new MockKeytar());
    });

    it('setUserInfo gets tokens set by setToken with the same environment', async () => {
        setEnvToPROD(environmentController);
        let expectedUserInfo = <UserInfo>{
            signType: 'GitHub',
            userEmail: 'fake@microsoft.com',
            userName: 'Fake User',
            userToken: 'fake-token'
        };
        await keyChain.setUserInfo(expectedUserInfo);
        let userInfo = await keyChain.getUserInfo();
        assert.deepStrictEqual(userInfo, expectedUserInfo);

        // Mock PPE environment
        setEnvToPPE(environmentController);

        // Test
        userInfo = await keyChain.getUserInfo();
        assert.equal(userInfo, undefined);
    });

    it('setUserInfo no longer returns removed tokens', async () => {
        let expectedUserInfo = <UserInfo>{
            signType: 'GitHub',
            userEmail: 'fake@microsoft.com',
            userName: 'Fake User',
            userToken: 'fake-token'
        };
        await keyChain.setUserInfo(expectedUserInfo);
        let userInfo = await keyChain.getUserInfo();
        assert.deepStrictEqual(userInfo, expectedUserInfo);

        await keyChain.resetUserInfo();
        userInfo = await keyChain.getUserInfo();
        assert.equal(userInfo, undefined);
    });
});