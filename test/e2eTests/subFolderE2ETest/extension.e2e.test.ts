import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, SinonSandbox } from 'sinon';
import vscode, { Diagnostic, Uri } from 'vscode';

import { DocfxExecutionResult } from '../../../src/build/buildResult';
import { DiagnosticController } from '../../../src/build/diagnosticController';
import { EnvironmentController } from '../../../src/common/environmentController';
import { EventStream } from '../../../src/common/eventStream';
import { EventType } from '../../../src/common/eventType';
import { BaseEvent, BuildCompleted, StartLanguageServerCompleted, UserSignInCompleted } from '../../../src/common/loggingEvents';
import { TimeOutError } from '../../../src/error/timeOutError';
import { OP_BUILD_USER_TOKEN_HEADER_NAME, uriHandler, UserType } from '../../../src/shared';
import { delay } from '../../../src/utils/utils';
import TestEventBus from '../../utils/testEventBus';
import { assertDiagnostic, assertDiagnostics, DiagnosticInfo, ensureExtensionActivatedAndInitializationFinished, fileNotFoundWarning, triggerCommand } from '../../utils/testHelper';

const detailE2EOutput: any = {};

const indexFileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "..", "index.md"));
const subFolderTestFileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "test.md"));

describe('Sub-folder E2E Test', () => {
    let sinon: SinonSandbox;
    let eventStream: EventStream;
    let testEventBus: TestEventBus;
    let environmentController: EnvironmentController;
    let diagnosticController: DiagnosticController;
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

        const detailE2EOutputFile = `${__dirname}/../../../../.temp/debug/detail-e2e-sub-folder-output.json`;
        fs.ensureFileSync(detailE2EOutputFile);
        fs.writeJSONSync(detailE2EOutputFile, detailE2EOutput);
    });

    it('Sign in to Docs and use real-time validation', (done) => {
        let currentDiagnostics: Diagnostic[] = [];

        (async function () {
            const dispose = eventStream.subscribe(async (event: BaseEvent) => {
                switch (event.type) {
                    case EventType.StartLanguageServerCompleted: {
                        if ((<StartLanguageServerCompleted>event).succeeded) {
                            await testOpenFile(indexFileUri, [fileNotFoundWarning]);
                            currentDiagnostics = [];
                            await testOpenFile(subFolderTestFileUri, [fileNotFoundWarning]);
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

            async function testOpenFile(filePath: Uri, expectedDiagnostics: DiagnosticInfo[]) {
                await vscode.window.showTextDocument(filePath);
                await updateCurrentDiagnosticsAsync(filePath);
                assertDiagnostic(currentDiagnostics, expectedDiagnostics);
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
                    [getFullPath("test.md")]: [fileNotFoundWarning],
                    [getFullPath("../index.md")]: [fileNotFoundWarning]
                });
            }
        })();
    });
});

function getFullPath(fileName: string): string {
    return path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, fileName);
}
