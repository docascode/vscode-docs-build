import assert from 'assert';
import cp from 'child_process';
import path from 'path';
import { Subscription } from 'rxjs';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import { setTimeout } from 'timers';
import vscode from 'vscode';
import { LanguageClient } from "vscode-languageclient/node";

import { BuildExecutor } from '../../../src/build/buildExecutor';
import { BuildInput, BuildType } from '../../../src/build/buildInput';
import { BuildResult, DocfxExecutionResult } from '../../../src/build/buildResult';
import { EnvironmentController } from '../../../src/common/environmentController';
import { EventStream } from '../../../src/common/eventStream';
import { EventType } from '../../../src/common/eventType';
import { DocfxBuildCompleted, DocfxBuildStarted, DocfxRestoreCompleted, DocfxRestoreStarted } from '../../../src/common/loggingEvents';
import { PlatformInformation } from '../../../src/common/platformInformation';
import { CredentialExpiryHandler } from '../../../src/credential/credentialExpiryHandler';
import { OP_BUILD_USER_TOKEN_HEADER_NAME, UserType } from '../../../src/shared';
import TelemetryReporter from '../../../src/telemetryReporter';
import * as childProcessUtil from '../../../src/utils/childProcessUtils';
import * as utils from '../../../src/utils/utils';
import { defaultLogPath, defaultOutputPath, fakedBuildInput, fakedExtensionContext, getFakedNonWindowsPlatformInformation, getFakedTelemetryReporter, getFakedWindowsPlatformInformation, getFakeEnvironmentController, publicTemplateURL, setTelemetryUserOptInToFalse, setTelemetryUserOptInToTrue, tempFolder } from '../../utils/faker';
import TestEventBus from '../../utils/testEventBus';

describe('BuildExecutor', () => {
    let sinon: SinonSandbox;
    let stubExecuteDocfx: SinonStub;

    let eventStream: EventStream;
    let subscription: Subscription;
    let fakedEnvironmentController: EnvironmentController;
    let fakedWindowsPlatformInformation: PlatformInformation;
    let fakedNonWindowsPlatformInformation: PlatformInformation;
    let fakedTelemetryReporter: TelemetryReporter;
    let buildExecutor: BuildExecutor;
    let testEventBus: TestEventBus;

    let executedCommands: string[];
    let executedOptions: cp.ExecOptions[];
    let killProcessTreeFuncCalled: boolean;

    const fakeSessionId = 'fakeSessionId';

    before(() => {
        eventStream = new EventStream();
        fakedEnvironmentController = getFakeEnvironmentController();
        fakedWindowsPlatformInformation = getFakedWindowsPlatformInformation();
        fakedNonWindowsPlatformInformation = getFakedNonWindowsPlatformInformation();
        fakedTelemetryReporter = getFakedTelemetryReporter();
        buildExecutor = new BuildExecutor(fakedExtensionContext, fakedWindowsPlatformInformation, fakedEnvironmentController, eventStream, fakedTelemetryReporter);

        testEventBus = new TestEventBus(eventStream);

        sinon = createSandbox();
        stubExecuteDocfx = undefined;

        sinon.stub(utils, 'killProcessTree').callsFake((pid: number, signal: string) => {
            killProcessTreeFuncCalled = true;
            return Promise.resolve();
        });
    });

    function mockExecuteDocfx(restoreExitCode: number, buildExitCode: number) {
        stubExecuteDocfx && stubExecuteDocfx.restore();
        stubExecuteDocfx = sinon.stub(childProcessUtil, 'executeDocfx').callsFake(
            function (command: string,
                eventStream: EventStream,
                exitHandler: (code: number, signal: string) => void,
                options?: cp.ExecOptions,
                stdoutHandler?: (data: string) => void,): cp.ChildProcess {

                let childKilled = false;
                executedCommands.push(command);
                executedOptions.push(options);
                if (command.indexOf(' restore ') !== -1) {
                    setTimeout(() => {
                        if (!childKilled) {
                            exitHandler(restoreExitCode, undefined);
                        }
                    }, 10);
                } else if (command.indexOf(' build ') !== -1) {
                    setTimeout(() => {
                        if (!childKilled) {
                            exitHandler(buildExitCode, undefined);
                        }
                    }, 10);
                } else if (command.indexOf(' serve ') !== -1) {
                    setTimeout(() => {
                        stdoutHandler("Now listening on: http://127.0.0.1:8080/");
                    }, 10);
                }

                return <any>{
                    pid: 1234,
                    kill: (signal: string) => {
                        childKilled = true;
                        exitHandler(0, signal);
                    }
                };
            });
    }

    beforeEach(() => {
        executedCommands = [];
        executedOptions = [];
        testEventBus.clear();
    });

    after(() => {
        sinon.restore();
        testEventBus.dispose();
    });

    describe('Restore', () => {
        it('Restore failed', async () => {
            mockExecuteDocfx(2, 0);

            const buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxRestoreStarted(),
                new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Failed, 2),
            ]);
            assert.equal(buildResult.result, DocfxExecutionResult.Failed);
            assert.equal(buildResult.isRestoreSkipped, false);

            // If restore does not succeeded, it should not be skipped in the next build
            testEventBus.clear();
            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxRestoreStarted(),
                new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Failed, 2),
            ]);
        });

        it('Restore Cancelled', (done) => {
            mockExecuteDocfx(0, 0);
            killProcessTreeFuncCalled = false;

            const buildPromise = buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');
            setTimeout(async () => {
                await buildExecutor.cancelBuild();
                const buildResult = await buildPromise;
                assert.deepStrictEqual(testEventBus.getEvents(), [
                    new DocfxRestoreStarted(),
                    new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Canceled, 0),
                ]);
                assert.equal(buildResult.result, DocfxExecutionResult.Canceled);
                assert.equal(buildResult.isRestoreSkipped, false);
                assert.equal(killProcessTreeFuncCalled, true);
                done();
            }, 5);
        });
    });

    describe('Build', () => {
        before(() => {
            mockExecuteDocfx(0, 0);
            sinon.stub(vscode.env, 'sessionId').get(function getSessionId() {
                return fakeSessionId;
            });
        });

        beforeEach(() => {
            testEventBus.clear();
        });

        afterEach(() => {
            subscription && subscription.unsubscribe();
        });

        it('First Time to run build successfully', async () => {
            const buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.equal(buildResult.result, DocfxExecutionResult.Succeeded);
            assert.equal(buildResult.isRestoreSkipped, false);

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe restore "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}"`,
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --dry-run --output "${defaultOutputPath}" --output-type "pagejson"`,
            ]);
            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_HTTP: `{"https://op-build-prod.azurewebsites.net":{"headers":{"${OP_BUILD_USER_TOKEN_HEADER_NAME}":"faked-build-token"}}}`,
                        DOCFX_SESSION_ID: fakeSessionId

                    }
                },
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_HTTP: `{"https://op-build-prod.azurewebsites.net":{"headers":{"${OP_BUILD_USER_TOKEN_HEADER_NAME}":"faked-build-token"}}}`,
                        DOCFX_SESSION_ID: fakeSessionId
                    }
                }
            ]);

            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxRestoreStarted(),
                new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Succeeded, 0),
                new DocfxBuildStarted(),
                new DocfxBuildCompleted(DocfxExecutionResult.Succeeded, 0)
            ]);
        });

        it('Second time to trigger build successfully', async () => {
            const buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.equal(buildResult.result, DocfxExecutionResult.Succeeded);
            assert.equal(buildResult.isRestoreSkipped, true);
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxBuildStarted(),
                new DocfxBuildCompleted(DocfxExecutionResult.Succeeded, 0)
            ]);
        });

        it('Build Failed', async () => {
            mockExecuteDocfx(0, 2);

            const buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.equal(buildResult.result, DocfxExecutionResult.Failed);
            assert.equal(buildResult.isRestoreSkipped, true);
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxBuildStarted(),
                new DocfxBuildCompleted(DocfxExecutionResult.Failed, 2)
            ]);
        });

        it('Build Cancelled', (done) => {
            mockExecuteDocfx(0, 0);
            killProcessTreeFuncCalled = false;
            // eslint-disable-next-line prefer-const
            let buildPromise: Promise<BuildResult>;

            subscription = eventStream.subscribe((event) => {
                if (event.type === EventType.DocfxBuildStarted) {
                    setTimeout(async () => {
                        let buildResult: BuildResult;
                        try {
                            await buildExecutor.cancelBuild();
                            buildResult = await buildPromise;
                        } catch (err) {
                            console.log(err);
                        }
                        assert.deepStrictEqual(testEventBus.getEvents(), [
                            new DocfxBuildStarted(),
                            new DocfxBuildCompleted(DocfxExecutionResult.Canceled, 0)
                        ]);
                        assert.equal(buildResult.result, DocfxExecutionResult.Canceled);
                        assert.equal(buildResult.isRestoreSkipped, true);
                        assert.equal(killProcessTreeFuncCalled, true);
                        done();
                    }, 5);
                }
            });

            buildPromise = buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');
        });

        it('Telemetry disabled', async () => {
            setTelemetryUserOptInToFalse(fakedTelemetryReporter);

            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_HTTP: `{"https://op-build-prod.azurewebsites.net":{"headers":{"${OP_BUILD_USER_TOKEN_HEADER_NAME}":"faked-build-token"}}}`,
                        DOCFX_SESSION_ID: fakeSessionId
                    }
                }
            ]);
            setTelemetryUserOptInToTrue(fakedTelemetryReporter);
        });

        it('Non-Windows Platform', async () => {
            buildExecutor = new BuildExecutor(fakedExtensionContext, fakedNonWindowsPlatformInformation, fakedEnvironmentController, eventStream, fakedTelemetryReporter);

            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(executedCommands, [
                `./docfx build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --dry-run --output "${defaultOutputPath}" --output-type "pagejson"`,
            ]);

            // Reset environment
            buildExecutor = new BuildExecutor(fakedExtensionContext, fakedWindowsPlatformInformation, fakedEnvironmentController, eventStream, fakedTelemetryReporter);
        });

        it('No Dry run', async () => {
            await buildExecutor.RunBuild(
                'fakedCorrelationId',
                <BuildInput>{
                    buildType: BuildType.FullBuild,
                    dryRun: false,
                    localRepositoryPath: path.resolve(tempFolder, 'fakedRepositoryPath'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository',
                    outputFolderPath: defaultOutputPath,
                    logPath: defaultLogPath
                },
                'faked-build-token'
            );

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --output "${defaultOutputPath}" --output-type "pagejson"`,
            ]);

            // Reset environment
            fakedEnvironmentController.debugMode = false;
        });

        it('Debug Mode', async () => {
            fakedEnvironmentController.debugMode = true;
            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --dry-run --output "${defaultOutputPath}" --output-type "pagejson" --verbose`,
            ]);

            // Reset environment
            fakedEnvironmentController.debugMode = false;
        });

        it('Build without credential', async () => {
            sinon.stub(fakedEnvironmentController, "userType").get(function getUserType() {
                return UserType.PublicContributor;
            });
            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, undefined);

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --dry-run --output "${defaultOutputPath}" --output-type "pagejson" --template "${publicTemplateURL}"`,
            ]);

            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_REPOSITORY_BRANCH: 'master',
                        DOCFX_HTTP: '{}',
                        DOCFX_SESSION_ID: fakeSessionId
                    }
                }
            ]);

            // Reset environment
            fakedEnvironmentController.debugMode = false;
        });
    });

    describe('Language Client', () => {
        let stubRegisterProposedFeatures: SinonStub;
        let stubListenCredentialExpiryRequest: SinonStub;
        before(() => {
            mockExecuteDocfx(0, 0);
            stubRegisterProposedFeatures = sinon.stub(LanguageClient.prototype, 'registerProposedFeatures');
            stubRegisterProposedFeatures.callsFake(() => {
                return;
            });
            stubListenCredentialExpiryRequest = sinon.stub(CredentialExpiryHandler.prototype, 'listenCredentialExpiryRequest');

            // @ts-ignore
            sinon.stub(BuildExecutor.prototype, "connectToServer").callsFake((port) => {
                return undefined;
            });
        });
        beforeEach(() => {
            testEventBus.clear();
        });
        afterEach(() => {
            stubRegisterProposedFeatures.reset();
            stubListenCredentialExpiryRequest.reset();
        });
        after(() => {
            stubRegisterProposedFeatures.restore();
            stubListenCredentialExpiryRequest.restore();
        });

        it('Public contributor', async () => {
            sinon.stub(fakedEnvironmentController, "userType").get(function getUserType() {
                return UserType.PublicContributor;
            });
            await buildExecutor.getLanguageClient(fakedBuildInput, undefined);
            assert.deepStrictEqual(executedCommands, [
                `docfx.exe serve "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --language-server --no-cache --address "localhost" --port 8080 --template "${publicTemplateURL}"`,
            ]);

            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: undefined,
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_REPOSITORY_BRANCH: 'master',
                        DOCFX_HTTP: '{}',
                        DOCFX_SESSION_ID: fakeSessionId
                    }
                }
            ]);

            assert(stubRegisterProposedFeatures.calledOnce);
            assert(stubListenCredentialExpiryRequest.calledOnce);
        });

        it('Microsoft employee', async () => {
            sinon.stub(fakedEnvironmentController, "userType").get(function getUserType() {
                return UserType.MicrosoftEmployee;
            });
            await buildExecutor.getLanguageClient(fakedBuildInput, 'fakeToken');
            assert.deepStrictEqual(executedCommands, [
                `docfx.exe serve "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --language-server --no-cache --address "localhost" --port 8080`,
            ]);

            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: undefined,
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_HTTP: `{"https://op-build-prod.azurewebsites.net":{"headers":{"${OP_BUILD_USER_TOKEN_HEADER_NAME}":"fakeToken"}}}`,
                        DOCFX_SESSION_ID: fakeSessionId
                    }
                }
            ]);
            assert(stubRegisterProposedFeatures.calledOnce);
            assert(stubListenCredentialExpiryRequest.calledOnce);
        });
    });
});