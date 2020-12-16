import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import { EnvironmentController } from '../../../src/common/environmentController';
import { LanguageServerManager } from '../../../src/observers/languageServerManager';
import vscode from 'vscode';
import { UserType } from '../../../src/shared';
import { ExtensionActivated } from '../../../src/common/loggingEvents';
import assert from 'assert';

describe('LanguageServerManager', () => {
    let sinon: SinonSandbox;
    let observer: LanguageServerManager;
    let stubExecuteCommand: SinonStub;

    before(() => {
        sinon = createSandbox();
        stubExecuteCommand = sinon.stub(vscode.commands, 'executeCommand').withArgs('docs.enableRealTimeValidation');
    });

    it('Real-time validation disabled', () => {
        observer = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableRealTimeValidation: false
        });
        observer.eventHandler(new ExtensionActivated());
        assert(stubExecuteCommand.notCalled);
    });

    it('Real-time validation enabled with unknown user type', () => {
        observer = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.Unknown,
            enableRealTimeValidation: true
        });
        observer.eventHandler(new ExtensionActivated());
        assert(stubExecuteCommand.notCalled);
    });

    it('Real-time validation enabled with user type selected', () => {
        observer = new LanguageServerManager(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.PublicContributor,
            enableRealTimeValidation: true
        });
        observer.eventHandler(new ExtensionActivated());
        assert(stubExecuteCommand.calledOnce);
    });
});