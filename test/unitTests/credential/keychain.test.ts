import { KeyChain, Keytar } from '../../../src/credential/keyChain';
import { EnvironmentController } from '../../../src/common/environmentController';
import { expect } from 'chai';
import { SinonSandbox, createSandbox } from 'sinon';
import { UserInfo } from '../../../src/shared';
import { mockPRODEnv, mockPPEEnv } from '../../utils/faker';

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
    let sinon: SinonSandbox;

    before(() => {
        environmentController = new EnvironmentController(undefined);
        sinon = createSandbox();
    });

    beforeEach(() => {
        keyChain = new KeyChain(environmentController, new MockKeytar());
    });

    it('getAADInfo gets tokens set by setAADInfo with the same environment', async () => {
        mockPRODEnv(sinon, environmentController);
        await keyChain.setAADInfo('fake-aad');
        let aadInfo = await keyChain.getAADInfo();
        expect(aadInfo).to.equal('fake-aad');

        // Mock PPE environment
        mockPRODEnv(sinon, environmentController);

        // Test
        aadInfo = await keyChain.getAADInfo();
        expect(aadInfo).to.be.undefined;
    });

    it('setUserInfo gets tokens set by setToken with the same environment', async () => {
        mockPRODEnv(sinon, environmentController);
        let expectedUserInfo = <UserInfo>{
            signType: 'GitHub',
            userEmail: 'fake@microsoft.com',
            userName: 'Fake User',
            userToken: 'fake-token'
        };
        await keyChain.setUserInfo(expectedUserInfo);
        let userInfo = await keyChain.getUserInfo();
        expect(userInfo).to.deep.equal(expectedUserInfo);

        // Mock PPE environment
        mockPPEEnv(sinon, environmentController);

        // Test
        userInfo = await keyChain.getUserInfo();
        expect(userInfo).to.be.undefined;
    });

    it('getAADInfo no longer returns removed tokens', async () => {
        await keyChain.setAADInfo('fake-aad');
        let aadInfo = await keyChain.getAADInfo();
        expect(aadInfo).to.equal('fake-aad');

        await keyChain.resetAADInfo();
        aadInfo = await keyChain.getAADInfo();
        expect(aadInfo).to.be.undefined;
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
        expect(userInfo).to.deep.equal(expectedUserInfo);

        await keyChain.resetUserInfo();
        userInfo = await keyChain.getUserInfo();
        expect(userInfo).to.be.undefined;
    });
});