import { SinonSandbox, createSandbox, SinonSpy } from 'sinon';
import { EnvironmentController } from '../../../src/common/environmentController';
import { LanguageServerManager } from '../../../src/build/languageServerManager';
import { UserType } from '../../../src/shared';
import { ExtensionActivated, StartLanguageServerCompleted, UserSignInCompleted } from '../../../src/common/loggingEvents';
import assert from 'assert';
import { BuildController } from '../../../src/build/buildController';
import { CredentialController } from '../../../src/credential/credentialController';

describe('LanguageServerManager', () => {
    const sinon: SinonSandbox = createSandbox();
    const fakeCorrelationId = 'fakeCorrelationId';
    const fakeBuildController = <BuildController><unknown>{
        startDocfxLanguageServer: () => {
            return;
        }
    };
    const fakeCredentialController = <CredentialController>{
        credential: undefined
    }

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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
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
            fakeBuildController,
            fakeCredentialController);
        manager.startLanguageServer();
        assert(spyStartLanguageServer.calledOnce);
        assert(manager.getLanguageServerStatus() === 'Starting');
    });
});