import vscode, { Uri, Diagnostic, Range, DiagnosticSeverity } from 'vscode';
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

interface DiagnosticInfo {
    range: Range;
    message: string;
    code: string;
    severity: DiagnosticSeverity;
}

describe('E2E Test', () => {
    let sinon: SinonSandbox;
    let eventStream: EventStream;
    let testEventBus: TestEventBus;

    before(async () => {
        if (!process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN) {
            throw new Error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN" from environment variable');
        }

        const fakedGitHubCallbackURL = <vscode.Uri>{
            authority: 'docsmsft.docs-build',
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

    it.only('build without sign-in', (done) => {
        (async function () {
            let dispose = eventStream.subscribe((event: BaseEvent) => {
                switch (event.type) {
                    case EventType.CredentialReset:
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

            triggerCommand('docs.signOut');

            function finalCheck(event: BuildCompleted) {
                detailE2EOutput['build without sign-in'] = testEventBus.getEvents();
                assert.equal(event.result, DocfxExecutionResult.Succeeded);

                assertDiagnostics({
                    "index.md": [
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: 'a.md'.`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'file-not-found',
                        }
                    ],
                    "docfx.json": [
                        <DiagnosticInfo>{
                            range: new Range(52, 39, 52, 39),
                            message: `Invalid moniker range 'netcore-1.1.0': Moniker 'netcore-1.1.0' is not defined.`,
                            severity: vscode.DiagnosticSeverity.Error,
                            code: 'moniker-range-invalid',
                        }
                    ]
                });
            }
        })();
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
                detailE2EOutput['Sign in to Docs and trigger build'] = testEventBus.getEvents();
                assert.equal(event.result, DocfxExecutionResult.Succeeded);

                assertDiagnostics({
                    "index.md": [
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: 'a.md'.`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'file-not-found',
                        }
                    ]
                });
            }
        })();
    });

    function assertDiagnostics(expected: { [key: string]: DiagnosticInfo[]; }) {
        Object.entries(expected).forEach(([file, expectedDiagnostics]) => {
            let fileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "vscode-docs-build-e2e-test", file));
            let diagnostics = vscode.languages.getDiagnostics(fileUri);

            let expectedDiagnosticsForCurrentFile: Diagnostic[] = [];
            expectedDiagnostics.forEach((item) => {
                let expectedDiagnostic = new Diagnostic(item.range, item.message, item.severity);
                expectedDiagnostic.code = item.code;
                expectedDiagnostic.source = 'Docs Validation';
                expectedDiagnosticsForCurrentFile.push(expectedDiagnostic);
            });
            assert.deepStrictEqual(diagnostics, expectedDiagnosticsForCurrentFile);
        });
    }
});
