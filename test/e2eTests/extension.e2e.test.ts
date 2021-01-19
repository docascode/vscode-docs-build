import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, SinonSandbox } from 'sinon';
import vscode, { Diagnostic, DiagnosticSeverity, Position, Range, Uri } from 'vscode';

import { DocfxExecutionResult } from '../../src/build/buildResult';
import { DiagnosticController } from '../../src/build/diagnosticController';
import { EnvironmentController } from '../../src/common/environmentController';
import { EventStream } from '../../src/common/eventStream';
import { EventType } from '../../src/common/eventType';
import { BaseEvent, BuildCompleted, StartLanguageServerCompleted, UserSignInCompleted } from '../../src/common/loggingEvents';
import { OP_BUILD_USER_TOKEN_HEADER_NAME, uriHandler, UserType } from '../../src/shared';
import TestEventBus from '../utils/testEventBus';
import { ensureExtensionActivatedAndInitializationFinished, triggerCommand } from '../utils/testHelper';
import { TimeOutError } from '../../src/error/timeOutError';
import { delay } from '../../src/utils/utils';

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
    let environmentController: EnvironmentController;
    let diagnosticController: DiagnosticController;
    const indexFileName = "index.md";
    const tempFileName = 'a.md';
    const timeOutMs = 120 * 1000;

    before(async () => {
        if (!process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN) {
            throw new Error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN" from environment variable');
        }

        const fakedGitHubCallbackURL = <vscode.Uri>{
            authority: 'docsmsft.docs-build',
            path: '/github-authenticate',
            query: `id=vsc-service-account-id&name=VSC-Service-Account&email=vscavu@microsoft.com&${OP_BUILD_USER_TOKEN_HEADER_NAME}=${process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN}`
        };

        sinon = createSandbox();
        sinon.stub(vscode.window, "showErrorMessage").resolvesArg(1);
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
        environmentController = extension.exports.environmentController;
        testEventBus = new TestEventBus(eventStream);
        diagnosticController = extension.exports.diagnosticController;
    });

    beforeEach(() => {
        testEventBus.clear();
    });

    afterEach(function () {
        detailE2EOutput[this.currentTest.fullTitle()] = testEventBus.getEvents();
        diagnosticController.reset();
    });

    after(() => {
        sinon.restore();

        const detailE2EOutputFile = `${__dirname}/../../../.temp/debug/detail-e2e-output.json`;
        fs.ensureFileSync(detailE2EOutputFile);
        fs.writeJSONSync(detailE2EOutputFile, detailE2EOutput);
    });

    it('Sign in to Docs and use real-time validation', (done) => {
        let currentDiagnostics: Diagnostic[] = [];
        const indexFileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "vscode-docs-build-e2e-test", indexFileName));
        const tempFileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "vscode-docs-build-e2e-test", tempFileName));

        (async function () {
            const dispose = eventStream.subscribe(async (event: BaseEvent) => {
                switch (event.type) {
                    case EventType.StartLanguageServerCompleted: {
                        if ((<StartLanguageServerCompleted>event).succeeded) {
                            await testOpenFile();
                            await testCreateFile();
                            await testDeleteFile();
                            await testModifyFile();

                            dispose.unsubscribe();
                            testEventBus.dispose();
                            done();
                        }
                        break;
                    }
                }
            });

            triggerCommand('docs.signIn');

            async function updateCurrentDiagnosticsAsync(fileUri: Uri) {
                return Promise.race(
                    [delay(timeOutMs, new TimeOutError('Timed out')),
                    new Promise<void>(async resolve => {
                        // eslint-disable-next-line
                        while (true) {
                            await delay(1000);
                            const diagnostics = vscode.languages.getDiagnostics(fileUri);
                            if (diagnostics.length != currentDiagnostics.length) {
                                currentDiagnostics = [];
                                diagnostics.forEach((item) => {
                                    const diagnostic = new Diagnostic(item.range, item.message, item.severity);
                                    diagnostic.code = item.code;
                                    diagnostic.source = item.source;
                                    currentDiagnostics.push(diagnostic);
                                });
                                resolve();
                                break;
                            }
                        }
                    })]);
            }

            async function testOpenFile() {
                await vscode.window.showTextDocument(indexFileUri);
                await updateCurrentDiagnosticsAsync(indexFileUri);
                assertDiagnostic(currentDiagnostics,
                    [
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: '${tempFileName}'.`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'file-not-found',
                        }
                    ]
                );
            }

            async function testModifyFile() {
                await vscode.window.showTextDocument(indexFileUri);
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.replace(indexFileUri, new Range(new Position(1, 0), new Position(1, 5)), "titer");
                await vscode.workspace.applyEdit(workspaceEdit);
                await updateCurrentDiagnosticsAsync(indexFileUri);
                assertDiagnostic(currentDiagnostics,
                    [
                        <DiagnosticInfo>{
                            range: new Range(1, 0, 1, 0),
                            message: `Missing required attribute: 'title'. Add a title string to show in search engine results.`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'title-missing',
                        },
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: '${tempFileName}'.`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'file-not-found',
                        }
                    ]
                );
            }

            async function testCreateFile() {
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.createFile(tempFileUri);
                await vscode.workspace.applyEdit(workspaceEdit);
                await updateCurrentDiagnosticsAsync(indexFileUri);
                assertDiagnostic(currentDiagnostics, []);
            }

            async function testDeleteFile() {
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.deleteFile(tempFileUri);
                await vscode.workspace.applyEdit(workspaceEdit);
                await updateCurrentDiagnosticsAsync(indexFileUri);
                assertDiagnostic(currentDiagnostics,
                    [
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: '${tempFileName}'.`,
                            severity: vscode.DiagnosticSeverity.Warning,
                            code: 'file-not-found',
                        }
                    ]
                );
            }
        })();
    });

    it('build without sign-in', (done) => {
        sinon.stub(environmentController, "userType").get(function getUserType() {
            return UserType.PublicContributor;
        });
        (async function () {
            const dispose = eventStream.subscribe((event: BaseEvent) => {
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
                    [indexFileName]: [
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: '${tempFileName}'.`,
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
        sinon.stub(environmentController, "userType").get(function getUserType() {
            return UserType.MicrosoftEmployee;
        });
        (async function () {
            const dispose = eventStream.subscribe((event: BaseEvent) => {
                switch (event.type) {
                    case EventType.UserSignInCompleted:
                        assert.equal((<UserSignInCompleted>event).succeeded, true);
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
                    [indexFileName]: [
                        <DiagnosticInfo>{
                            range: new Range(7, 0, 7, 0),
                            message: `Invalid file link: '${tempFileName}'.`,
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
            const fileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "vscode-docs-build-e2e-test", file));
            const diagnostics = vscode.languages.getDiagnostics(fileUri);
            assertDiagnostic(diagnostics, expectedDiagnostics);
        });
    }

    function assertDiagnostic(actualDiagnostics: Diagnostic[], expectedDiagnosticInfos: DiagnosticInfo[]) {
        const expectedDiagnostics: Diagnostic[] = [];
        expectedDiagnosticInfos.forEach((item) => {
            const diagnostic = new Diagnostic(item.range, item.message, item.severity);
            diagnostic.code = item.code;
            diagnostic.source = 'Docs Validation';
            expectedDiagnostics.push(diagnostic);
        });
        assert.deepStrictEqual(actualDiagnostics, expectedDiagnostics);
    }
});
