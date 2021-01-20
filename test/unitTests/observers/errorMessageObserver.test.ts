import assert from 'assert';
import { createSandbox,SinonSandbox } from 'sinon';
import vscode, { MessageItem } from 'vscode';

import { BuildResult } from '../../../src/build/buildResult';
import { BuildFailed, BuildSucceeded, CredentialExpired,PublicContributorSignIn, StartLanguageServerCompleted, TriggerCommandWithUnknownUserType, UserSignInFailed, UserSignInSucceeded, UserSignOutFailed, UserSignOutSucceeded } from '../../../src/common/loggingEvents';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { ErrorMessageObserver } from '../../../src/observers/errorMessageObserver';
import { MessageAction } from '../../../src/shared';
import { fakedBuildInput, fakedCredential } from '../../utils/faker';

describe('ErrorMessageObserver', () => {
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
            const event = new UserSignInFailed(`fakedCorrelationId`, new Error("faked message."));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Signing in failed: faked message.');
            assert.deepEqual(messageActions, []);
        });

        it(`Sign in succeeded`, () => {
            const event = new UserSignInSucceeded(`fakedCorrelationId`, fakedCredential, true);
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
            const event = new UserSignOutFailed(`fakedCorrelationId`, new Error("faked message."));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Signing out failed: faked message.');
            assert.deepEqual(messageActions, []);
        });

        it(`Sign out succeeded`, () => {
            const event = new UserSignOutSucceeded(`fakedCorrelationId`);
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
            const event = new BuildSucceeded(`fakedCorrelationId`, fakedBuildInput, 0, <BuildResult>{});
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Build failed since credential expires`, () => {
            const event = new BuildFailed(`fakedCorrelationId`, fakedBuildInput, 0, new DocsError("faked message.", ErrorCode.TriggerBuildWithCredentialExpired));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Repository validation failed. faked message. Please check the channel output for details');
            assert.deepEqual(messageActions, [new MessageAction('Sign in', 'docs.signIn')]);
        });

        it(`Build failed since not signed in`, () => {
            const event = new BuildFailed(`fakedCorrelationId`, fakedBuildInput, 0, new DocsError("faked message.", ErrorCode.TriggerBuildBeforeSignIn));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Repository validation failed. faked message. Please check the channel output for details');
            assert.deepEqual(messageActions, [new MessageAction('Sign in', 'docs.signIn')]);
        });
    });

    it(`Public contributor sign in`, () => {
        const event = new PublicContributorSignIn();
        observer.eventHandler(event);
        assert.equal(messageToShow, '[Docs Validation] Sign in is only available for Microsoft employees.');
        assert.deepEqual(messageActions, []);
    });

    it(`Trigger command with unknown user type`, () => {
        const event = new TriggerCommandWithUnknownUserType();
        observer.eventHandler(event);
        assert.equal(messageToShow, '[Docs Validation] The command you triggered needs user type information. Please choose either Microsoft employee or Public contributor. You can change your selection later if needed in the extension settings (Docs validation -> User type).');
        assert.deepEqual(messageActions[0].title, "Microsoft employee");
        assert.deepEqual(messageActions[1].title, "Public contributor");
    });

    describe(`Start language server`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Start language server fails since credential expires`, () => {
            const event = new StartLanguageServerCompleted(false, new DocsError('fake error.', ErrorCode.TriggerBuildWithCredentialExpired));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Enable real-time validation failed. fake error. Please check the channel output for details');
            assert.deepEqual(messageActions, [new MessageAction('Sign in', 'docs.signIn')]);
        });

        it(`Start language server fails since not signed in`, () => {
            const event = new StartLanguageServerCompleted(false, new DocsError('fake error.', ErrorCode.TriggerBuildWithCredentialExpired));
            observer.eventHandler(event);
            assert.equal(messageToShow, '[Docs Validation] Enable real-time validation failed. fake error. Please check the channel output for details');
            assert.deepEqual(messageActions, [new MessageAction('Sign in', 'docs.signIn')]);
        });

        it(`Start language server succeeds`, () => {
            const event = new StartLanguageServerCompleted(true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`Credential expired while language server is running`, () => {
        it(`Credential expired`, () => {
            const event = new CredentialExpired(true);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Credential Expired, please sign in again.`);
            assert.deepEqual(messageActions, [new MessageAction(
                'Sign in',
                'docs.signIn'
            )]);
        });
    });
});