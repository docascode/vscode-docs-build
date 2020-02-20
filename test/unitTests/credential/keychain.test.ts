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

    it('getAADInfo gets tokens set by setAADInfo with the same environment', async () => {
        setEnvToPROD(environmentController);
        await keyChain.setAADInfo('fake-aad');
        let aadInfo = await keyChain.getAADInfo();
        assert.equal(aadInfo, 'fake-aad');

        // Mock PPE environment
        setEnvToPPE(environmentController);

        // Test
        aadInfo = await keyChain.getAADInfo();
        assert.equal(aadInfo, undefined);
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

    it('getAADInfo no longer returns removed tokens', async () => {
        await keyChain.setAADInfo('fake-aad');
        let aadInfo = await keyChain.getAADInfo();
        assert.equal(aadInfo, 'fake-aad');

        await keyChain.resetAADInfo();
        aadInfo = await keyChain.getAADInfo();
        assert.equal(aadInfo, undefined);
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