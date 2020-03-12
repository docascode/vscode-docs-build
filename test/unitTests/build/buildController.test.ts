import fs from 'fs-extra';
import vscode from 'vscode';
import * as reportGenerator from '../../../src/build/reportGenerator';
import * as utils from '../../../src/utils/utils';
import assert from 'assert';
import path from 'path';
import { EventStream } from '../../../src/common/eventStream';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import TestEventBus from '../../utils/testEventBus';
import { OPBuildAPIClient } from '../../../src/build/opBuildAPIClient';
import { BuildExecutor } from '../../../src/build/buildExecutor';
import { BuildResult, DocfxExecutionResult } from '../../../src/build/buildResult';
import { BuildInput } from '../../../src/build/buildInput';
import { BuildController } from '../../../src/build/buildController';
import { DiagnosticController } from '../../../src/build/diagnosticController';
import { fakedCredential } from '../../utils/faker';
import { BuildTriggered, BuildFailed, BuildProgress, RepositoryInfoRetrieved, BuildInstantAllocated, BuildStarted, BuildSucceeded, BuildInstantReleased, BuildCanceled, CancelBuildTriggered, CancelBuildSucceeded } from '../../../src/common/loggingEvents';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { Credential } from '../../../src/credential/credentialController';

describe('BuildController', () => {
    let sinon: SinonSandbox;
    let visualizeBuildReportCalled: boolean;
    let stubExistsSync: SinonStub;
    let stubSafelyReadJsonFile: SinonStub;
    let stubGetRepositoryInfoFromLocalFolder: SinonStub;
    let stubWorkspaceFolders: SinonStub;

    let buildController: BuildController;

    let eventStream: EventStream;
    let testEventBus: TestEventBus;

    const fakedOPBuildAPIClient = <OPBuildAPIClient>{
        getOriginalRepositoryUrl: (gitRepoUrl: string, opBuildUserToken: string, eventStream: EventStream): Promise<string> => {
            return new Promise((resolve, reject) => {
                resolve('https://faked.original.repository');
            });
        }
    };

    const fakedOpConfigPath = path.normalize('/fakedFolder/.openpublishing.publish.config.json');

    before(() => {
        eventStream = new EventStream();
        testEventBus = new TestEventBus(eventStream);

        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Succeeded), fakedOPBuildAPIClient, undefined, eventStream);

        sinon = createSandbox();
    });

    function getFakedBuildExecutor(docfxExecutionResult: DocfxExecutionResult): BuildExecutor {
        let buildCancelled = false;
        return <any>{
            RunBuild: (correlationId: string, input: BuildInput, buildUserToken: string): Promise<BuildResult> => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (buildCancelled) {
                            resolve(<BuildResult>{
                                result: DocfxExecutionResult.Canceled,
                                isRestoreSkipped: false
                            });
                            buildCancelled = false;
                        } else {
                            resolve(<BuildResult>{
                                result: docfxExecutionResult,
                                isRestoreSkipped: false
                            });
                        }
                    }, 10);
                });
            },
            cancelBuild: (): Promise<void> => {
                buildCancelled = true;
                return Promise.resolve();
            }
        };
    }

    beforeEach(() => {
        visualizeBuildReportCalled = false;
        testEventBus.clear();
        sinon.restore();
        sinon.stub(reportGenerator, "visualizeBuildReport").callsFake((repositoryPath: string, diagnosticController: DiagnosticController, eventStream: EventStream) => {
            visualizeBuildReportCalled = true;
        });
        sinon.stub(utils, "getDurationInSeconds").returns(1);
        stubWorkspaceFolders = sinon.stub(vscode.workspace, "workspaceFolders").get(() => {
            return [<vscode.WorkspaceFolder>{
                name: 'fakedWorkspaceFolder',
                uri: vscode.Uri.parse("fakedFolder/")
            }];
        });
        stubExistsSync = sinon.stub(fs, "existsSync").withArgs(fakedOpConfigPath).returns(true);
        stubSafelyReadJsonFile = sinon.stub(utils, "safelyReadJsonFile").withArgs(fakedOpConfigPath).returns({
            docs_build_engine: {
                name: 'docfx_v3'
            }
        });
        stubGetRepositoryInfoFromLocalFolder = sinon
            .stub(utils, "getRepositoryInfoFromLocalFolder")
            .resolves(['GitHub', 'https://faked.repository', undefined, undefined]);
    });

    afterEach(() => {
    });

    after(() => {
        sinon.restore();
    });

    it('Trigger build without specific workspace', async () => {
        stubWorkspaceFolders.get(() => {
            return [{}, {}];
        });

        await buildController.build('fakedCorrelationId', undefined, fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    'Multiple workspace folders are opened. Please right click any file inside the target workspace folder to trigger the build',
                    ErrorCode.TriggerBuildWithoutSpecificWorkspace
                ))
        ]);
    });

    it('Trigger build on non-workspace', async () => {
        let stubGetWorkspaceFolder = sinon.stub(vscode.workspace, "getWorkspaceFolder").returns(undefined);

        await buildController.build('fakedCorrelationId', vscode.Uri.file('fakedFolder/'), fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    'You can only trigger the build on a workspace folder.',
                    ErrorCode.TriggerBuildOnNonWorkspace
                ))
        ]);
        stubGetWorkspaceFolder.restore();
    });

    it('Trigger build on non-Docs repository', async () => {
        stubExistsSync.withArgs(fakedOpConfigPath).returns(false);

        await buildController.build('fakedCorrelationId', undefined, fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Cannot find '.openpublishing.publish.config.json' file under current workspace folder.`,
                    ErrorCode.TriggerBuildOnNonDocsRepo
                ))
        ]);
    });

    it('Trigger build on V2 repository', async () => {
        stubSafelyReadJsonFile.withArgs(fakedOpConfigPath).returns({});

        await buildController.build('fakedCorrelationId', undefined, fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Docs Build requires the repository enable DocFX v3`,
                    ErrorCode.TriggerBuildOnV2Repo,
                    undefined,
                    [fakedOpConfigPath]
                ))
        ]);
    });

    it('Trigger build before signed in', async () => {
        await buildController.build('fakedCorrelationId', undefined, <Credential>{
            signInStatus: 'Initializing'
        });
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `You have to sign-in firstly`,
                    ErrorCode.TriggerBuildBeforeSignedIn
                ))
        ]);
    });

    it('Trigger build on invalid docs repository', async () => {
        stubGetRepositoryInfoFromLocalFolder.throws(new Error('Faked error msg'));

        await buildController.build('fakedCorrelationId', undefined, fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildProgress('Retrieving repository information for the current workspace folder...\n'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Cannot get the repository information for the current workspace folder(Faked error msg)`,
                    ErrorCode.TriggerBuildOnInvalidDocsRepo
                ))
        ]);
    });

    it('Successfully build', async () => {
        await buildController.build('fakedCorrelationId', undefined, fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildProgress('Retrieving repository information for the current workspace folder...\n'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildSucceeded(
                'fakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: path.normalize('/fakedFolder/'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository'
                },
                1,
                <BuildResult>{
                    result: DocfxExecutionResult.Succeeded,
                    isRestoreSkipped: false
                }
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, true);
    });

    it('Trigger two builds at the same time', async () => {
        let firstBuildPromise = buildController.build('fakedCorrelationId1', undefined, fakedCredential);
        let secondBuildPromise = buildController.build('fakedCorrelationId2', undefined, fakedCredential);
        await Promise.all([firstBuildPromise, secondBuildPromise]);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId1'),
            new BuildTriggered('fakedCorrelationId2'),
            new BuildProgress('Retrieving repository information for the current workspace folder...\n'),
            new BuildProgress('Retrieving repository information for the current workspace folder...\n'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildFailed(
                'fakedCorrelationId2',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: path.normalize('/fakedFolder/'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository'
                },
                1,
                new DocsError(
                    `Last build has not finished.`,
                    ErrorCode.TriggerBuildWhenInstantNotAvailable
                )
            ),
            new BuildSucceeded(
                'fakedCorrelationId1',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: path.normalize('/fakedFolder/'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository'
                },
                1,
                <BuildResult>{
                    result: DocfxExecutionResult.Succeeded,
                    isRestoreSkipped: false
                }
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, true);
    });

    it('Build Failed', async () => {
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Failed), fakedOPBuildAPIClient, undefined, eventStream);

        await buildController.build('fakedCorrelationId', undefined, fakedCredential);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildProgress('Retrieving repository information for the current workspace folder...\n'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildFailed(
                'fakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: path.normalize('/fakedFolder/'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository'
                },
                1,
                new DocsError(
                    `Running docfx failed`,
                    ErrorCode.RunDocfxFailed
                )
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, false);

        // Reset environment
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Succeeded), fakedOPBuildAPIClient, undefined, eventStream);
    });

    it('Build Cancelled', async () => {
        let buildPromise = buildController.build('fakedCorrelationId', undefined, fakedCredential);
        setTimeout(() => { buildController.cancelBuild(); }, 5);
        await buildPromise;
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId'),
            new BuildProgress('Retrieving repository information for the current workspace folder...\n'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new CancelBuildTriggered('fakedCorrelationId'),
            new CancelBuildSucceeded('fakedCorrelationId'),
            new BuildCanceled(
                'fakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    localRepositoryPath: path.normalize('/fakedFolder/'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository'
                }, 1
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, false);
    });
});