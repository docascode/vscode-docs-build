import cp from 'child_process';
import assert from 'assert';
import path from 'path';
import * as childProcessUtil from '../../../src/utils/childProcessUtils';
import * as utils from '../../../src/utils/utils';
import { EventStream } from '../../../src/common/eventStream';
import { EnvironmentController } from '../../../src/common/environmentController';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import TestEventBus from '../../utils/testEventBus';
import { getFakeEnvironmentController, getFakedTelemetryReporter, fakedExtensionContext, fakedBuildInput, tempFolder, setTelemetryUserOptInToFalse, setTelemetryUserOptInToTrue, getFakedWindowsPlatformInformation, getFakedNonWindowsPlatformInformation, defaultLogPath, defaultOutputPath, publicTemplateURL } from '../../utils/faker';
import { PlatformInformation } from '../../../src/common/platformInformation';
import TelemetryReporter from '../../../src/telemetryReporter';
import { BuildExecutor } from '../../../src/build/buildExecutor';
import { DocfxRestoreStarted, DocfxRestoreCompleted, DocfxBuildStarted, DocfxBuildCompleted } from '../../../src/common/loggingEvents';
import { DocfxExecutionResult, BuildResult } from '../../../src/build/buildResult';
import { setTimeout } from 'timers';
import { EventType } from '../../../src/common/eventType';
import { Subscription } from 'rxjs';
import { BuildType, BuildInput } from '../../../src/build/buildInput';

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
    let executedStdinInput: string[];
    let killProcessTreeFuncCalled: boolean;

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
                stdinInput?: string): cp.ChildProcess {

                let childKilled = false;
                executedCommands.push(command);
                executedOptions.push(options);
                executedStdinInput.push(stdinInput);
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
        executedStdinInput = [];
        testEventBus.clear();
    });

    afterEach(() => {
    });

    after(() => {
        sinon.restore();
        testEventBus.dispose();
    });

    describe('Restore', () => {
        it('Restore failed', async () => {
            mockExecuteDocfx(2, 0);

            let buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

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

            let buildPromise = buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');
            setTimeout(async () => {
                await buildExecutor.cancelBuild();
                let buildResult = await buildPromise;
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
        });

        beforeEach(() => {
            testEventBus.clear();
        });

        afterEach(() => {
            subscription && subscription.unsubscribe();
        });

        it('First Time to run build successfully', async () => {
            let buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.equal(buildResult.result, DocfxExecutionResult.Succeeded);
            assert.equal(buildResult.isRestoreSkipped, false);

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe restore "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --stdin`,
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --stdin --dry-run --output "${defaultOutputPath}"`,
            ]);
            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD'
                    }
                },
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD'
                    }
                }
            ]);
            assert.equal(executedStdinInput.length, 2);
            assert.notEqual(executedStdinInput[0], undefined);
            assert.notEqual(executedStdinInput[1], undefined);
            let firstExecutedStdinInput = <any>JSON.parse(executedStdinInput[0]);
            assert.deepStrictEqual(firstExecutedStdinInput.http["https://op-build-prod.azurewebsites.net"], {
                "headers": {
                    "X-OP-BuildUserToken": "faked-build-token"
                }
            });
            let secondExecutedStdinInput = <any>JSON.parse(executedStdinInput[1]);
            assert.deepStrictEqual(secondExecutedStdinInput.http["https://op-build-prod.azurewebsites.net"], {
                "headers": {
                    "X-OP-BuildUserToken": "faked-build-token"
                }
            });

            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxRestoreStarted(),
                new DocfxRestoreCompleted('fakedCorrelationId', DocfxExecutionResult.Succeeded, 0),
                new DocfxBuildStarted(),
                new DocfxBuildCompleted(DocfxExecutionResult.Succeeded, 0)
            ]);
        });

        it('Second time to trigger build successfully', async () => {
            let buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.equal(buildResult.result, DocfxExecutionResult.Succeeded);
            assert.equal(buildResult.isRestoreSkipped, true);
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new DocfxBuildStarted(),
                new DocfxBuildCompleted(DocfxExecutionResult.Succeeded, 0)
            ]);
        });

        it('Build Failed', async () => {
            mockExecuteDocfx(0, 2);

            let buildResult = await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

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
                        DOCS_ENVIRONMENT: 'PROD'
                    }
                }
            ]);
            setTelemetryUserOptInToTrue(fakedTelemetryReporter);
        });

        it('Non-Windows Platform', async () => {
            buildExecutor = new BuildExecutor(fakedExtensionContext, fakedNonWindowsPlatformInformation, fakedEnvironmentController, eventStream, fakedTelemetryReporter);

            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(executedCommands, [
                `./docfx build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --stdin --dry-run --output "${defaultOutputPath}"`,
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
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --stdin --output "${defaultOutputPath}"`,
            ]);

            // Reset environment
            fakedEnvironmentController.debugMode = false;
        });

        it('Debug Mode', async () => {
            fakedEnvironmentController.debugMode = true;
            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, 'faked-build-token');

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --stdin --verbose --dry-run --output "${defaultOutputPath}"`,
            ]);

            // Reset environment
            fakedEnvironmentController.debugMode = false;
        });

        it('Build without credential', async () => {
            await buildExecutor.RunBuild('fakedCorrelationId', fakedBuildInput, undefined);

            assert.deepStrictEqual(executedCommands, [
                `docfx.exe build "${path.resolve(tempFolder, 'fakedRepositoryPath')}" --log "${defaultLogPath}" --stdin --template "${publicTemplateURL}" --dry-run --output "${defaultOutputPath}"`,
            ]);

            let stdinInput = <any>JSON.parse(executedStdinInput[0]);
            assert.equal(stdinInput.http["https://op-build-prod.azurewebsites.net"], undefined);

            assert.deepStrictEqual(executedOptions, [
                {
                    cwd: `${path.resolve(tempFolder, 'fakedExtensionPath', '.docfx')}`,
                    env: {
                        APPINSIGHTS_INSTRUMENTATIONKEY: '4424c909-fdd9-4229-aecb-ad2a52b039e6',
                        DOCFX_CORRELATION_ID: 'fakedCorrelationId',
                        DOCFX_REPOSITORY_URL: 'https://faked.original.repository',
                        DOCS_ENVIRONMENT: 'PROD',
                        DOCFX_REPOSITORY_BRANCH: 'master'
                    }
                }
            ]);

            // Reset environment
            fakedEnvironmentController.debugMode = false;
        });
    });
});