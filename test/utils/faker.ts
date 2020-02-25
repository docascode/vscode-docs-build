import { EnvironmentController } from '../../src/common/environmentController';
import { AbsolutePathPackage } from '../../src/dependency/package';
import { Credential } from '../../src/credential/credentialController';

export function getFakeEnvironmentController(): EnvironmentController {
    return {
        env: 'PROD',
    };
}

export function setEnvToPROD(environmentController: EnvironmentController) {
    environmentController.env = 'PROD';
}

export function setEnvToPPE(environmentController: EnvironmentController) {
    environmentController.env = 'PPE';
}

export const fakedPackage = new AbsolutePathPackage(
    'faked-id',
    'fakedName',
    'Faked package description',
    'https://faked.url',
    'faked.binary',
    'faked-rid',
    'faked-integrity'
);

export const fakedCredential = <Credential>{
    signInStatus: 'SignedIn',
    userInfo: {
        signType: 'GitHub',
        userEmail: 'fake@microsoft.com',
        userName: 'Faked User',
        userToken: 'faked-token'
    }
}