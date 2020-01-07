import { EnvironmentController } from '../../src/common/environmentController';

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