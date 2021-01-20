import assert from 'assert';
import { createSandbox, SinonSandbox, SinonSpy } from 'sinon';

import { BuildController } from '../../../src/build/buildController';
import { LanguageServerManager } from '../../../src/build/languageServerManager';
import { EnvironmentController } from '../../../src/common/environmentController';
import { ExtensionActivated, StartLanguageServerCompleted, UserSignInCompleted } from '../../../src/common/loggingEvents';
import { UserType } from '../../../src/shared';

describe('LanguageServerManager', () => {
    const sinon: SinonSandbox = createSandbox();
    const fakeCorrelationId = 'fakeCorrelationId';
    const fakeBuildController = <BuildController><unknown>{
        startDocfxLanguageServer: () => {
            return;
        }
    };
    const spyStartLanguageServer: SinonSpy = sinon.spy(fakeBuildController, 'startDocfxLanguageServer');

    let manager: LanguageServerManager;

    afterEach(() => {
        spyStartLanguageServer.resetHistory();
    });
    after(() => {
        spyStartLanguageServer.restore();
    });

    it('Real-time validation disabled', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: false
        },
            fakeBuildController);
        manager.eventHandler(new ExtensionActivated());
        assert(spyStartLanguageServer.notCalled);
    });

    it('Real-time validation enabled with unknown user type', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.Unknown,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        manager.eventHandler(new ExtensionActivated());
        assert(spyStartLanguageServer.notCalled);
    });

    it('Real-time validation enabled with user type selected', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.PublicContributor,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        manager.eventHandler(new ExtensionActivated());
        assert(spyStartLanguageServer.calledOnce);
    });

    it('Handle start language server succeeds', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        assert(manager.getLanguageServerStatus() === 'Idle');
        manager.eventHandler(new StartLanguageServerCompleted(true));
        assert(manager.getLanguageServerStatus() === 'Running');
    });

    it('Handle start language server fails', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        assert(manager.getLanguageServerStatus() === 'Idle');
        manager.eventHandler(new StartLanguageServerCompleted(false));
        assert(manager.getLanguageServerStatus() === 'Idle');
    });

    it('Handle user sign-in succeeds when language server is running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        manager.eventHandler(new StartLanguageServerCompleted(true));
        manager.eventHandler(new UserSignInCompleted(fakeCorrelationId, true));
        assert(spyStartLanguageServer.notCalled);
    });

    it('Handle user sign-in succeeds when language server is not running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        assert(manager.getLanguageServerStatus() === 'Idle');
        manager.eventHandler(new UserSignInCompleted(fakeCorrelationId, true));
        assert(spyStartLanguageServer.calledOnce);
    });

    it('Handle user sign-in fails when language server is not running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        assert(manager.getLanguageServerStatus() === 'Idle');
        manager.eventHandler(new UserSignInCompleted(fakeCorrelationId, false));
        assert(manager.getLanguageServerStatus() === 'Idle');
        assert(spyStartLanguageServer.notCalled);
    });

    it('Handle start server command entered during language server is running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        manager.eventHandler(new StartLanguageServerCompleted(true));
        manager.startLanguageServer();
        assert(spyStartLanguageServer.notCalled);
        assert(manager.getLanguageServerStatus() === 'Running');
    });

    it('Handle start server command entered during language server is not running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        },
            fakeBuildController);
        manager.startLanguageServer();
        assert(spyStartLanguageServer.calledOnce);
        assert(manager.getLanguageServerStatus() === 'Starting');
    });
});