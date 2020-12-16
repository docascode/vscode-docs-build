import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import { EnvironmentController } from '../../../src/common/environmentController';
import { LanguageServerManager } from '../../../src/observers/languageServerManager';
import vscode from 'vscode';
import { UserType } from '../../../src/shared';
import { ExtensionActivated } from '../../../src/common/loggingEvents';
import assert from 'assert';

describe('LanguageServerManager', () => {
    let sinon: SinonSandbox;
    let manager: LanguageServerManager;
    let stubExecuteCommand: SinonStub;

    before(() => {
        sinon = createSandbox();
        stubExecuteCommand = sinon.stub(vscode.commands, 'executeCommand').withArgs('docs.enableRealTimeValidation');
    });

    it('Real-time validation disabled', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableRealTimeValidation: false
        });
        manager.eventHandler(new ExtensionActivated());
        assert(stubExecuteCommand.notCalled);
    });

    it('Real-time validation enabled with unknown user type', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.Unknown,
            enableRealTimeValidation: true
        });
        manager.eventHandler(new ExtensionActivated());
        assert(stubExecuteCommand.notCalled);
    });

    it('Real-time validation enabled with user type selected', () => {
        manager = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.PublicContributor,
            enableRealTimeValidation: true
        });
        manager.eventHandler(new ExtensionActivated());
        assert(stubExecuteCommand.calledOnce);
    });
});