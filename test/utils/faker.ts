import { EnvironmentController } from '../../src/common/environmentController';
import { AbsolutePathPackage } from '../../src/dependency/package';

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