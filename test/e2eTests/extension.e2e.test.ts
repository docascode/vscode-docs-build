import vscode, { Uri, Diagnostic, Range } from 'vscode';
import assert from 'assert';
import path from 'path';
import fs from 'fs-extra';
import { ensureExtensionActivatedAndInitializationFinished, triggerCommand } from '../utils/testHelper';
import { EventType } from '../../src/common/eventType';
import { BaseEvent, UserSignInCompleted, BuildCompleted } from '../../src/common/loggingEvents';
import { createSandbox, SinonSandbox } from 'sinon';
import { uriHandler } from '../../src/shared';
import { DocfxExecutionResult } from '../../src/build/buildResult';
import TestEventBus from '../utils/testEventBus';
import { EventStream } from '../../src/common/eventStream';

const detailE2EOutput: any = {};

describe('E2E Test', () => {
    let sinon: SinonSandbox;
    let eventStream: EventStream;
    let testEventBus: TestEventBus;

    before(async () => {
        if (!process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN) {
            throw new Error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN" from environment variable');
        }

        const fakedGitHubCallbackURL = <vscode.Uri>{
            authority: 'ceapex.docs-build',
            path: '/github-authenticate',
            query: `id=vsc-service-account-id&name=VSC-Service-Account&email=vscavu@microsoft.com&X-OP-BuildUserToken=${process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN}`
        };

        sinon = createSandbox();
        sinon.stub(vscode.env, 'openExternal').callsFake(
            function (target: vscode.Uri): Thenable<boolean> {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        uriHandler.handleUri(fakedGitHubCallbackURL);
                    }, 10);
                    resolve(true);
                });
            }
        );

        const extension = await ensureExtensionActivatedAndInitializationFinished();
        assert.notEqual(extension, undefined);

        eventStream = extension.exports.eventStream;
        testEventBus = new TestEventBus(eventStream);
    });

    beforeEach(() => {
        testEventBus.clear();
    });

    afterEach(function () {
        detailE2EOutput[this.currentTest.fullTitle()] = testEventBus.getEvents();
    });

    after(() => {
        sinon.restore();

        const detailE2EOutputFile = `${__dirname}/../../../.temp/debug/detail-e2e-output.json`;
        fs.ensureFileSync(detailE2EOutputFile);
        fs.writeJSONSync(detailE2EOutputFile, detailE2EOutput);
    });

    it('Sign in to Docs and trigger build', (done) => {
        (async function () {
            let dispose = eventStream.subscribe((event: BaseEvent) => {
                switch (event.type) {
                    case EventType.UserSignInCompleted:
                        let asUserSignInCompleted = <UserSignInCompleted>event;
                        assert.equal(asUserSignInCompleted.succeeded, true);
                        triggerCommand('docs.build');
                        break;
                    case EventType.BuildCompleted:
                        finalCheck(<BuildCompleted>event);
                        break;
                    case EventType.BuildInstantReleased:
                        dispose.unsubscribe();
                        testEventBus.dispose();
                        done();
                        break;
                }
            });

            triggerCommand('docs.signIn');

            function finalCheck(event: BuildCompleted) {
                assert.equal(event.result, DocfxExecutionResult.Succeeded);

                let fileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "vscode-docs-build-e2e-test", "index.md"));
                let diagnostics = vscode.languages.getDiagnostics(fileUri);

                const expectedDiagnostic = new Diagnostic(new Range(7, 0, 7, 0), `Invalid file link: 'a.md'.`, vscode.DiagnosticSeverity.Warning);
                expectedDiagnostic.code = 'file-not-found';
                expectedDiagnostic.source = 'Docs Validation';

                assert.deepStrictEqual(diagnostics, [expectedDiagnostic]);
            }
        })();
    });
});
