import { SinonSandbox, createSandbox } from 'sinon';
import { EnvironmentController } from '../../../src/common/environmentController';
import { StartLanguageServerObserver } from '../../../src/observers/startLanguageServerObserver';
import vscode from 'vscode';
import { UserType } from '../../../src/shared';
import { ExtensionActivated } from '../../../src/common/loggingEvents';
import assert from 'assert';

describe('StartServerTriggerObserver', () => {
    let sinon: SinonSandbox;
    let observer: StartLanguageServerObserver;
    let event: ExtensionActivated;
    let spy: any;

    before(() => {
        sinon = createSandbox();
        spy = sinon.spy(vscode.commands, 'executeCommand');
        event = new ExtensionActivated();
    });

    it('Real-time validation disabled', () => {
        observer = new StartLanguageServerObserver(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.MicrosoftEmployee,
            enableRealTimeValidation: false
        });
        observer.eventHandler(event);
        assert(spy.withArgs('docs.startServer').notCalled);
    });

    it('Real-time validation enabled with unknown user type', () => {
        observer = new StartLanguageServerObserver(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.Unknown,
            enableRealTimeValidation: true
        });
        observer.eventHandler(event);
        assert(spy.withArgs('docs.startServer').notCalled);
    });

    it('Real-time validation enabled with user type selected', () => {
        observer = new StartLanguageServerObserver(<EnvironmentController>{
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.PublicContributor,
            enableRealTimeValidation: true
        });
        observer.eventHandler(event);
        assert(spy.withArgs('docs.startServer').calledOnce);
    });
});