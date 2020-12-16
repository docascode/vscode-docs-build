import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import { EnvironmentController } from '../../../src/common/environmentController';
import { LanguageServerManager } from '../../../src/build/languageServerManager';
import vscode from 'vscode';
import { UserType } from '../../../src/shared';
import { ExtensionActivated, StartLanguageServerCompleted, UserSignInCompleted } from '../../../src/common/loggingEvents';
import assert from 'assert';

describe('LanguageServerManager', () => {
    let sinon: SinonSandbox;
    let manager: LanguageServerManager;
    let stubVSCodeExecuteCommand: SinonStub;
    const fakeCorrelationId = 'fakeCorrelationId';

    before(() => {
        sinon = createSandbox();
        stubVSCodeExecuteCommand = sinon.stub(vscode.commands, 'executeCommand');
    });
    afterEach(() => {
        stubVSCodeExecuteCommand.reset();
    });
    after(() => {
        stubVSCodeExecuteCommand.restore();
    });

    it('Real-time validation disabled', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: false
        });
        manager.eventHandler(new ExtensionActivated());
        assert(stubVSCodeExecuteCommand.withArgs('docs.enableRealTimeValidation').notCalled);
    });

    it('Real-time validation enabled with unknown user type', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.Unknown,
            enableAutomaticRealTimeValidation: true
        });
        manager.eventHandler(new ExtensionActivated());
        assert(stubVSCodeExecuteCommand.withArgs('docs.enableRealTimeValidation').notCalled);
    });

    it('Real-time validation enabled with user type selected', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.PublicContributor,
            enableAutomaticRealTimeValidation: true
        });
        manager.eventHandler(new ExtensionActivated());
        assert(stubVSCodeExecuteCommand.withArgs('docs.enableRealTimeValidation').calledOnce);
    });

    it('Handle start language server succeeds', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        });
        assert(manager.getLanguageServerStatus() === 'Idle');
        manager.eventHandler(new StartLanguageServerCompleted(true));
        assert(manager.getLanguageServerStatus() === 'Running');
    });

    it('Handle user sign-in succeeds when language server is running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        });
        manager.eventHandler(new StartLanguageServerCompleted(true));
        manager.eventHandler(new UserSignInCompleted(fakeCorrelationId, true));
        assert(stubVSCodeExecuteCommand.withArgs('docs.enableRealTimeValidation').notCalled);
    });

    it('Handle user sign-in succeeds when language server is not running', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableAutomaticRealTimeValidation: true
        });
        assert(manager.getLanguageServerStatus() === 'Idle');
        manager.eventHandler(new UserSignInCompleted(fakeCorrelationId, true));
        assert(stubVSCodeExecuteCommand.withArgs('docs.enableRealTimeValidation').calledOnce);
    });
});