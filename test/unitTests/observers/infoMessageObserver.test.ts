import assert from 'assert';
import vscode, { MessageItem } from 'vscode';
import { UserSignInCompleted, UserSignOutCompleted, BuildTriggered, BuildCompleted, ExtensionActivated, CredentialExpiredDuringLanguageServerRunning } from '../../../src/common/loggingEvents';
import { getFakeEnvironmentController } from '../../utils/faker';
import { EnvironmentController } from '../../../src/common/environmentController';
import { InfoMessageObserver } from '../../../src/observers/infoMessageObserver';
import { SinonSandbox, createSandbox } from 'sinon';
import { MessageAction, UserType } from '../../../src/shared';
import { DocfxExecutionResult } from '../../../src/build/buildResult';

describe('InfoMessageObserver', () => {
    let sinon: SinonSandbox;

    let messageToShow: string;
    let messageActions: MessageItem[];

    let environmentController: EnvironmentController;
    let observer: InfoMessageObserver;

    before(() => {
        environmentController = getFakeEnvironmentController();
        observer = new InfoMessageObserver(environmentController);

        sinon = createSandbox();

        sinon
            .stub(vscode.window, 'showInformationMessage')
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
            const event = new UserSignInCompleted(`fakedCorrelationId`, false, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Sign in succeeded with credential retrieved from cache`, () => {
            const event = new UserSignInCompleted(`fakedCorrelationId`, true, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Sign in succeeded without credential retrieved from cache for full-repo validation`, () => {
            const event = new UserSignInCompleted(`fakedCorrelationId`, true, false, 'FullRepoValidation');
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Successfully signed in! Would you like to validate the current repository?`);
            assert.deepEqual(messageActions, [
                new MessageAction('Validate', 'docs.build', 'Would you like to validate the current repository?')
            ]);
        });

        it(`Sign in succeeded without credential retrieved from cache for real-time validation`, () => {
            const event = new UserSignInCompleted(`fakedCorrelationId`, true, false, 'RealTimeValidation');
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Successfully signed in!`);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`UserSignOutCompleted`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Sign out failed`, () => {
            const event = new UserSignOutCompleted(`fakedCorrelationId`, false);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Sign out succeeded`, () => {
            const event = new UserSignOutCompleted(`fakedCorrelationId`, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Successfully signed out!`);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`BuildTriggered`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Signed in`, () => {
            const event = new BuildTriggered(`fakedCorrelationId`, true);
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
            const event = new BuildCompleted(`fakedCorrelationId`, DocfxExecutionResult.Succeeded, undefined, undefined);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Build finished. Please open the 'Problem' panel to see the results`);
            assert.deepEqual(messageActions, [new MessageAction(
                "Open",
                'workbench.actions.view.problems'
            )]);
        });

        it(`Build fails`, () => {
            const event = new BuildCompleted(`fakedCorrelationId`, DocfxExecutionResult.Failed, undefined, undefined);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`Extension activated`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`User type unknown`, () => {
            sinon.stub(environmentController, "userType").get(function getUserType() {
                return UserType.Unknown;
            });
            const event = new ExtensionActivated();
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Are you a Microsoft employee or a public contributor? We need this information to provide a better validation experience. ` +
                `You can change your selection later if needed in the extension settings (Docs validation -> User type).`);
            assert.deepEqual(messageActions[0].title, "Microsoft employee");
            assert.deepEqual(messageActions[1].title, "Public contributor");
        });

        it(`User type received`, () => {
            sinon.stub(environmentController, "userType").get(function getUserType() {
                return UserType.MicrosoftEmployee;
            });
            const event = new ExtensionActivated();
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });
    });

    describe(`Credential expired while language server is running`, () => {
        it(`Credential expired`, () => {
            const event = new CredentialExpiredDuringLanguageServerRunning();
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Credential Expired, please sign in again.`);
            assert.deepEqual(messageActions, [new MessageAction(
                'Sign in',
                'docs.signIn'
            )]);
        });
    });
});