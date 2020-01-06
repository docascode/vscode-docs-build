import { SinonSandbox } from 'sinon';
import { EnvironmentController } from '../../src/common/environmentController';

export function mockPRODEnv(sinon: SinonSandbox, environmentController: EnvironmentController) {
    sinon.stub(environmentController, 'env').get(() => 'PROD');
}

export function mockPPEEnv(sinon: SinonSandbox, environmentController: EnvironmentController){
    sinon.stub(environmentController, 'env').get(() => 'PPE');
}