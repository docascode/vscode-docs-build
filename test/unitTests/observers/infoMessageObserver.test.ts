import assert from 'assert';
import vscode, { MessageItem } from 'vscode';
import { UserSignInCompleted, UserSignOutCompleted, BuildTriggered, BuildCompleted } from '../../../src/common/loggingEvents';
import { getFakeEnvironmentController } from '../../utils/faker';
import { EnvironmentController } from '../../../src/common/environmentController';
import { InfoMessageObserver } from '../../../src/observers/infoMessageObserver';
import { SinonSandbox, createSandbox } from 'sinon';
import { MessageAction } from '../../../src/shared';
import { DocfxExecutionResult } from '../../../src/build/buildResult';

describe('InfoMessageObserver', () => {
    let sinon: SinonSandbox;
    // let stubShowInformationMessage: SinonStub;

    let messageToShow: string;
    let messageActions: MessageItem[];

    let environmentController: EnvironmentController;
    let observer: InfoMessageObserver;

    before(() => {
        environmentController = getFakeEnvironmentController();
        observer = new InfoMessageObserver(environmentController);

        sinon = createSandbox();

        // stubShowInformationMessage =
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
            let event = new UserSignInCompleted(`fakedCorrelationId`, false, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Sign in succeeded with credential retrieved from cache`, () => {
            let event = new UserSignInCompleted(`fakedCorrelationId`, true, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Sign in succeeded without credential retrieved from cache`, () => {
            let event = new UserSignInCompleted(`fakedCorrelationId`, true, false);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Successfully signed in! Would you like to validate the current workspace folder?`);
            assert.deepEqual(messageActions, [
                new MessageAction('Validate', 'docs.build', 'Would you like to validate the current workspace folder?')
            ]);
        });
    });

    describe(`UserSignOutCompleted`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Sign out failed`, () => {
            let event = new UserSignOutCompleted(`fakedCorrelationId`, false);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`Sign out succeeded`, () => {
            let event = new UserSignOutCompleted(`fakedCorrelationId`, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Successfully signed out!`);
            assert.deepEqual(messageActions, [undefined]);
        });
    });

    describe(`BuildTriggered`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Signed in`, () => {
            let event = new BuildTriggered(`fakedCorrelationId`, true);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });

        it(`EnableSignRecommendHint as true`, () => {
            let event = new BuildTriggered(`fakedCorrelationId`, false);
            environmentController.enableSignRecommendHint = false;
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);

            // reset
            environmentController.enableSignRecommendHint = true;
        });

        it(`EnableSignRecommendHint as true`, () => {
            let event = new BuildTriggered(`fakedCorrelationId`, false);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] If you are a Microsoft internal user, you are recommended to login to the Docs system by the status-bar, or you may get some validation errors if some non-live data (e.g. UID, moniker) has been used.`);
            assert.deepEqual(messageActions[0].title, "Don't show this message again");
        });
    });

    describe(`BuildCompleted`, () => {
        beforeEach(() => {
            messageToShow = undefined;
            messageActions = [];
        });

        it(`Build succeeded`, () => {
            let event = new BuildCompleted(`fakedCorrelationId`, DocfxExecutionResult.Succeeded, undefined, undefined);
            observer.eventHandler(event);
            assert.equal(messageToShow, `[Docs Validation] Build finished. Please open the 'Problem' panel to see the results`);
            assert.deepEqual(messageActions, [new MessageAction(
                "Open",
                'workbench.actions.view.problems'
            )]);
        });

        it(`Build fails`, () => {
            let event = new BuildCompleted(`fakedCorrelationId`, DocfxExecutionResult.Failed, undefined, undefined);
            observer.eventHandler(event);
            assert.equal(messageToShow, undefined);
            assert.deepEqual(messageActions, []);
        });
    });
});