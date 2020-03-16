import vscode, { Uri, Diagnostic, Range } from 'vscode';
import assert from 'assert';
import path from 'path';
import { ensureExtensionActivatedAndInitializationFinished } from '../utils/testHelper';
import { EventType } from '../../src/common/eventType';
import { BaseEvent, UserSignInCompleted, BuildCompleted } from '../../src/common/loggingEvents';
import { createSandbox, SinonSandbox } from 'sinon';
import { uriHandler } from '../../src/shared';
import { DocfxExecutionResult } from '../../src/build/buildResult';

describe('E2E Test', () => {
    let sinon: SinonSandbox;
    before(() => {
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
    });

    after(() => {
        sinon.restore();
    });

    it('Sign in to Docs and trigger build', (done) => {
        (async function () {
            const extension = await ensureExtensionActivatedAndInitializationFinished();
            assert.notEqual(extension, undefined);

            extension.exports.eventStream.subscribe((event: BaseEvent) => {
                switch (event.type) {
                    case EventType.UserSignInCompleted:
                        let asUserSignInCompleted = <UserSignInCompleted>event;
                        assert.equal(asUserSignInCompleted.succeeded, true);
                        triggerBuild();
                        break;
                    case EventType.BuildCompleted:
                        finalCheck(<BuildCompleted>event);
                        done();
                        break;
                }
            });

            triggerSignIn();

            function triggerSignIn() {
                vscode.commands.executeCommand('docs.signIn');
            }

            function triggerBuild() {
                vscode.commands.executeCommand('docs.build');
            }

            function finalCheck(event: BuildCompleted) {
                assert.equal(event.result, DocfxExecutionResult.Succeeded);

                let fileUri = Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "vscode-docs-build-e2e-test", "index.md"));
                let diagnostics = vscode.languages.getDiagnostics(fileUri);

                const expectedDiagnostic = new Diagnostic(new Range(6, 0, 6, 0), `Invalid file link: 'a.md'.`, vscode.DiagnosticSeverity.Warning);
                expectedDiagnostic.code = 'file-not-found';
                expectedDiagnostic.source = 'Docs Validation';

                assert.deepStrictEqual(diagnostics, [expectedDiagnostic]);
            }
        })();
    });
});
