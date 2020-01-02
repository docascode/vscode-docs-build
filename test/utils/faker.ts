import { SinonSandbox } from 'sinon';
import { EnvironmentController } from '../../src/common/EnvironmentController';

export function MocPRODEnv(sinon: SinonSandbox, environmentController: EnvironmentController) {
    sinon.stub(environmentController, 'env').get(() => 'PROD');
}

export function MocPPEEnv(sinon: SinonSandbox, environmentController: EnvironmentController){
    sinon.stub(environmentController, 'env').get(() => 'PPE');
}