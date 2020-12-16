import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import { EnvironmentController } from '../../../src/common/environmentController';
import { StartLanguageServerObserver } from '../../../src/observers/startLanguageServerObserver';
import vscode from 'vscode';
import { UserType } from '../../../src/shared';
import { ExtensionActivated } from '../../../src/common/loggingEvents';
import assert from 'assert';

describe('StartLanguageServerObserver', () => {
    let sinon: SinonSandbox;
    let observer: StartLanguageServerObserver;
    let stubExecuteCommand: SinonStub;

    before(() => {
        sinon = createSandbox();
        stubExecuteCommand = sinon.stub(vscode.commands, 'executeCommand').withArgs('docs.enableRealTimeValidation');
    });

    it('Real-time validation disabled', () => {
        observer = new StartLanguageServerObserver(<EnvironmentController>{
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
        observer = new StartLanguageServerObserver(<EnvironmentController>{
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
        observer = new StartLanguageServerObserver(<EnvironmentController>{
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