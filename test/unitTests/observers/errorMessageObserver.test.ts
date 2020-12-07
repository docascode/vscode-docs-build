import assert from 'assert';
import vscode, { MessageItem } from 'vscode';
import { UserSignInCompleted, UserSignOutCompleted, BuildTriggered, BuildCompleted, ExtensionActivated, UserSignInFailed, UserSignOutFailed, UserSignOutSucceeded, UserSignInSucceeded, BuildSucceeded, BuildFailed, PublicContributorSignIn, TriggerCommandWithUnkownUserType } from '../../../src/common/loggingEvents';
import { fakedBuildInput, fakedCredential, getFakeEnvironmentController } from '../../utils/faker';
import { EnvironmentController } from '../../../src/common/environmentController';
import { InfoMessageObserver } from '../../../src/observers/infoMessageObserver';
import { SinonSandbox, createSandbox } from 'sinon';
import { MessageAction, UserType } from '../../../src/shared';
import { BuildResult, DocfxExecutionResult } from '../../../src/build/buildResult';
import { ErrorMessageObserver } from '../../../src/observers/errorMessageObserver';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';

describe.only('ErrorMessageObserver', () => {
    let sinon: SinonSandbox;

    let messageToShow: string;
    let messageActions: MessageItem[];

    let observer: ErrorMessageObserver;

    before(() => {
        observer = new ErrorMessageObserver();

        sinon = createSandbox();

        sinon
            .stub(vscode.window, 'showErrorMessage')
            .callsFake((message: string, ...items: any[]) => {
                messageToShow = message;
                messageActions = items;

                return undefined;
            });
    });

    beforeEach(() => {
        messageToShow = undefined;
        messageActions = [];
    });

    after(() => {
        sinon.restore();
    });

    describe(`UserSignInCompleted`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Sign in failed`, () => {
            let event = new UserSignInFailed(`fakedCorrelationId`, new Error("faked message"));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Signing in failed: faked message');
            assert.deepEqual(messageActions, []);
        });

        it(`Sign in succeeded`, () => {
            let event = new UserSignInSucceeded(`fakedCorrelationId`, fakedCredential, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`UserSignOutCompleted`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Sign out failed`, () => {
            let event = new UserSignOutFailed(`fakedCorrelationId`, new Error("faked message"));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Signing out failed: faked message');
            assert.deepEqual(messageActions, []);
        });

        it(`Sign out succeeded`, () => {
            let event = new UserSignOutSucceeded(`fakedCorrelationId`);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`BuildCompleted`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Build succeeded`, () => {
            let event = new BuildSucceeded(`fakedCorrelationId`, fakedBuildInput, 0, <BuildResult>{});
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Build failed since credential expires`, () => {
            let event = new BuildFailed(`fakedCorrelationId`, fakedBuildInput, 0, new DocsError("faked message", ErrorCode.TriggerBuildWithCredentialExpired));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Repository validation failed. faked message Check the channel output for details');
            assert.deepEqual(messageActions, [new MessageAction('Sign in', 'docs.signIn')]);
        });

        it(`Build failed since not signed in`, () => {
            let event = new BuildFailed(`fakedCorrelationId`, fakedBuildInput, 0, new DocsError("faked message", ErrorCode.TriggerBuildBeforeSignIn));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Repository validation failed. faked message Check the channel output for details');
            assert.deepEqual(messageActions, [new MessageAction('Sign in', 'docs.signIn')]);
        });
    });

    it(`Public contributor sign in`, () => {
        let event = new PublicContributorSignIn();
        observer.eventHandler(event);
        assert.equal(messageToShow, '[Docs Validation] Sign in is only available for Microsoft employees.');
        assert.deepEqual(messageActions, []);
    });

    it(`Trigger command with unkown user type`, () => {
        let event = new TriggerCommandWithUnkownUserType();
        observer.eventHandler(event);
        assert.equal(messageToShow, '[Docs Validation] The command you triggered needs user type information. Please choose either Microsoft employee or Public contributor. You can change your selection later if needed in the extension settings (Docs validation -> User type).');
        assert.deepEqual(messageActions[0].title, "Microsoft employee");
        assert.deepEqual(messageActions[1].title, "Public contributor");
    });
});