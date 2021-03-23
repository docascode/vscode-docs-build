import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, SinonSandbox, SinonStub } from 'sinon';
import vscode, { DiagnosticCollection } from 'vscode';

import { BuildController } from '../../../src/build/buildController';
import { BuildInput } from '../../../src/build/buildInput';
import { BuildResult, DocfxExecutionResult } from '../../../src/build/buildResult';
import { DiagnosticController } from '../../../src/build/diagnosticController';
import { OPBuildAPIClient } from '../../../src/build/opBuildAPIClient';
import * as reportGenerator from '../../../src/build/reportGenerator';
import { EnvironmentController } from '../../../src/common/environmentController';
import { EventStream } from '../../../src/common/eventStream';
import { BuildCanceled, BuildFailed, BuildInstantAllocated, BuildInstantReleased, BuildProgress, BuildStarted, BuildSucceeded, BuildTriggered, CancelBuildSucceeded, CancelBuildTriggered, CredentialExpired, RepositoryInfoRetrieved, StartLanguageServerCompleted } from '../../../src/common/loggingEvents';
import { Credential } from '../../../src/credential/credentialController';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { UserType } from '../../../src/shared';
import * as utils from '../../../src/utils/utils';
import { defaultLogPath, defaultOutputPath, fakedCredential,fakedCredentialController, getFakedBuildExecutor, getFakeEnvironmentController } from '../../utils/faker';
import TestEventBus from '../../utils/testEventBus';

const expectedBuildInput = <BuildInput>{
    buildType: 'FullBuild',
    dryRun: true,
    localRepositoryPath: path.normalize('/fakedFolder/'),
    localRepositoryUrl: 'https://faked.repository',
    originalRepositoryUrl: 'https://faked.original.repository',
    outputFolderPath: defaultOutputPath,
    logPath: defaultLogPath,
    workspaceFolderName: "fakedWorkspaceFolder",
    port: undefined,
};

describe('BuildController', () => {
    let sinon: SinonSandbox;
    let visualizeBuildReportCalled: boolean;
    let stubExistsSync: SinonStub;
    let stubSafelyReadJsonFile: SinonStub;
    let stubGetRepositoryInfoFromLocalFolder: SinonStub;
    let stubWorkspaceFolders: SinonStub;
    let stubSetDiagnosticCollection: SinonStub;
    const fakeEnvironmentController = getFakeEnvironmentController();

    let buildController: BuildController;

    let eventStream: EventStream;
    let testEventBus: TestEventBus;

    let tokenUsedForBuild: string;
    let tokenUsedForAPICall: string;

    const fakedOPBuildAPIClient = <OPBuildAPIClient>{
        getProvisionedRepositoryUrlByDocsetNameAndLocale: (docsetName: string, locale = 'en-us', opBuildUserToken: string, eventStream: EventStream): Promise<string> => {
            tokenUsedForAPICall = opBuildUserToken;
            return new Promise((resolve, reject) => {
                resolve('https://faked.original.repository');
            });
        },
        validateCredential: (opBuildUserToken: string, eventStream: EventStream): Promise<boolean> => {
            return new Promise((resolve, reject) => {
                resolve(true);
            });
        }
    };

    const fakedDiagnosticController = <DiagnosticController><unknown>{
        setDiagnosticCollection: (diagnosticController: DiagnosticController): void => {
            return;
        }
    }

    const fakedOpConfigPath = path.normalize('/fakedFolder/.openpublishing.publish.config.json');

    before(() => {
        eventStream = new EventStream();
        testEventBus = new TestEventBus(eventStream);

        sinon = createSandbox();
    });

    beforeEach(() => {
        buildController = new BuildController(
            getFakedBuildExecutor(
                DocfxExecutionResult.Succeeded,
                (correlationId: string, input: BuildInput, buildUserToken: string) => {
                    tokenUsedForBuild = buildUserToken;
                }),
            fakedOPBuildAPIClient, fakedDiagnosticController,
            fakeEnvironmentController, eventStream,
            fakedCredentialController
        );
        tokenUsedForBuild = undefined;
        tokenUsedForAPICall = undefined;
        visualizeBuildReportCalled = false;
        testEventBus.clear();
        sinon.restore();
        sinon.stub(reportGenerator, "visualizeBuildReport").callsFake((repositoryPath: string, logPath: string, diagnosticController: DiagnosticController, eventStream: EventStream) => {
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
            docsets_to_publish: [
                {
                    docset_name: "fakedDocset"
                }
            ],
            docs_build_engine: {
                name: 'docfx_v3'
            }
        });
        stubGetRepositoryInfoFromLocalFolder = sinon
            .stub(utils, "getRepositoryInfoFromLocalFolder")
            .resolves(['GitHub', 'https://faked.repository', undefined, undefined, undefined]);
        stubSetDiagnosticCollection = sinon.stub(fakedDiagnosticController, 'setDiagnosticCollection');
    });

    after(() => {
        sinon.restore();
    });

    it('Trigger build on workspace with multiple folders', async () => {
        stubWorkspaceFolders.get(() => {
            return [{}, {}];
        });

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    'Validation is triggered on a workspace which contains multiple folders, please close other folders and only keep one in the current workspace',
                    ErrorCode.TriggerBuildOnWorkspaceWithMultipleFolders
                ))
        ]);
    });

    it('Trigger build on non-workspace', async () => {
        stubWorkspaceFolders = sinon.stub(vscode.workspace, "workspaceFolders").get(() => undefined);

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    'You can only trigger the build on a workspace folder.',
                    ErrorCode.TriggerBuildOnNonWorkspace
                ))
        ]);
    });

    it('Trigger build on non-Docs repository', async () => {
        stubExistsSync.withArgs(fakedOpConfigPath).returns(false);

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Cannot find '.openpublishing.publish.config.json' file under current workspace folder, please open the root directory of the repository and retry`,
                    ErrorCode.TriggerBuildOnNonDocsRepo
                ))
        ]);
    });

    it('Trigger build on V2 repository', async () => {
        stubSafelyReadJsonFile.withArgs(fakedOpConfigPath).returns({
            "docs_build_engine": {
                "name": "docfx_v2"
            }
        });

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Docs Validation Extension requires the repository has DocFX v3 enabled`,
                    ErrorCode.TriggerBuildOnV2Repo,
                    undefined
                ))
        ]);
    });

    it('Trigger build when credential expires', async () => {
        const opBuildAPIClient = <OPBuildAPIClient>{
            validateCredential: (opBuildUserToken: string, eventStream: EventStream): Promise<boolean> => {
                return new Promise((resolve, reject) => {
                    resolve(false);
                });
            }
        };
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Succeeded), opBuildAPIClient, undefined, fakeEnvironmentController, eventStream, fakedCredentialController);

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new CredentialExpired(),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Credential has expired. Please sign in again to continue.`,
                    ErrorCode.TriggerBuildWithCredentialExpired
                ))
        ]);
    });

    it('Trigger build on invalid docs repository', async () => {
        stubGetRepositoryInfoFromLocalFolder.throws(new Error('Faked error msg'));

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Cannot get the repository information for current workspace folder(Faked error msg)`,
                    ErrorCode.TriggerBuildOnInvalidDocsRepo
                ))
        ]);
    });

    it('Trigger build before signed in', async () => {
        const stubCredential = sinon.stub(fakedCredentialController, 'credential').get(() => {
            return <Credential>{ signInStatus: 'Initializing' };
        });
        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', false),
            new BuildFailed('fakedCorrelationId', undefined, 1,
                new DocsError(
                    `Microsoft employees must sign in before validating.`,
                    ErrorCode.TriggerBuildBeforeSignIn
                ))
        ]);
        stubCredential.restore();
    });

    it('Successfully build by Microsoft employee', async () => {
        // First time
        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildSucceeded(
                'fakedCorrelationId',
                expectedBuildInput,
                1,
                <BuildResult>{
                    result: DocfxExecutionResult.Succeeded,
                    isRestoreSkipped: false
                }
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, true);
        assert.equal(tokenUsedForBuild, 'faked-token');
        assert.equal(tokenUsedForAPICall, 'faked-token');

        // Second time
        testEventBus.clear();
        visualizeBuildReportCalled = false;
        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildSucceeded(
                'fakedCorrelationId',
                expectedBuildInput,
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

    it('Successfully build by public contributor', async () => {
        const tempEnvironmentController: EnvironmentController = {
            env: 'PROD',
            docsRepoType: 'GitHub',
            debugMode: false,
            userType: UserType.PublicContributor,
            enableAutomaticRealTimeValidation: false
        };
        buildController = new BuildController(
            getFakedBuildExecutor(
                DocfxExecutionResult.Succeeded,
                (correlationId: string, input: BuildInput, buildUserToken: string) => {
                    tokenUsedForBuild = buildUserToken;
                }),
            fakedOPBuildAPIClient, undefined,
            tempEnvironmentController, eventStream,
            fakedCredentialController
        );
        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildSucceeded(
                'fakedCorrelationId',
                expectedBuildInput,
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

    it('Trigger build on learn repository', async () => {
        stubSafelyReadJsonFile.withArgs(fakedOpConfigPath).returns({
            "docsets_to_publish": [{
                "docset_name": "fakedDocset",
                "customized_tasks": {
                    "docset_postbuild": [
                        "_dependentPackages/CommonPlugins/tools/TripleCrownValidation.ps1"
                    ]
                }
            }, {}]
        });

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildSucceeded(
                'fakedCorrelationId',
                <BuildInput>{
                    buildType: 'FullBuild',
                    dryRun: false,
                    localRepositoryPath: path.normalize('/fakedFolder/'),
                    localRepositoryUrl: 'https://faked.repository',
                    originalRepositoryUrl: 'https://faked.original.repository',
                    outputFolderPath: defaultOutputPath,
                    logPath: defaultLogPath,
                    workspaceFolderName: "fakedWorkspaceFolder",
                    port: undefined,
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

    it('Successfully build with getting repo info by docset name', async () => {
        const opBuildAPIClient = <OPBuildAPIClient>{
            validateCredential: (opBuildUserToken: string, eventStream: EventStream): Promise<boolean> => {
                return new Promise((resolve, reject) => {
                    resolve(true);
                });
            },
            getProvisionedRepositoryUrlByDocsetNameAndLocale: (docsetName: string, locale = 'en-us', opBuildUserToken: string, eventStream: EventStream): Promise<string> => {
                return new Promise((resolve, reject) => {
                    resolve('https://faked.original.repository');
                });
            },
        };
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Succeeded), opBuildAPIClient, undefined, fakeEnvironmentController, eventStream, fakedCredentialController);

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildSucceeded(
                'fakedCorrelationId',
                expectedBuildInput,
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
        const firstBuildPromise = buildController.build('fakedCorrelationId1');
        const secondBuildPromise = buildController.build('fakedCorrelationId2');
        await Promise.all([firstBuildPromise, secondBuildPromise]);
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId1', true),
            new BuildTriggered('fakedCorrelationId2', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildFailed(
                'fakedCorrelationId2',
                expectedBuildInput,
                1,
                new DocsError(
                    `Last build has not finished.`,
                    ErrorCode.TriggerBuildWhenInstantNotAvailable
                )
            ),
            new BuildSucceeded(
                'fakedCorrelationId1',
                expectedBuildInput,
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
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Failed), fakedOPBuildAPIClient, undefined, fakeEnvironmentController, eventStream, fakedCredentialController);

        await buildController.build('fakedCorrelationId');
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new BuildFailed(
                'fakedCorrelationId',
                expectedBuildInput,
                1,
                new DocsError(
                    `Running DocFX failed`,
                    ErrorCode.RunDocfxFailed
                )
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, false);

        // Reset environment
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Succeeded), fakedOPBuildAPIClient, undefined, fakeEnvironmentController, eventStream, fakedCredentialController);
    });

    it('Build Cancelled', async () => {
        const buildPromise = buildController.build('fakedCorrelationId');
        setTimeout(() => { buildController.cancelBuild(); }, 5);
        await buildPromise;
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildTriggered('fakedCorrelationId', true),
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new BuildInstantAllocated(),
            new BuildStarted('fakedWorkspaceFolder'),
            new CancelBuildTriggered('fakedCorrelationId'),
            new CancelBuildSucceeded('fakedCorrelationId'),
            new BuildCanceled(
                'fakedCorrelationId',
                expectedBuildInput,
                1
            ),
            new BuildInstantReleased(),
        ]);
        assert.equal(visualizeBuildReportCalled, false);
    });

    it('Start language server succeeds', async () => {
        await buildController.startDocfxLanguageServer();
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildProgress('Retrieving repository information for current workspace folder...'),
            new BuildProgress('Trying to get provisioned repository information...'),
            new RepositoryInfoRetrieved('https://faked.repository', 'https://faked.original.repository'),
            new StartLanguageServerCompleted(true)
        ]);
        assert.equal(tokenUsedForBuild, 'faked-token');
        assert(stubSetDiagnosticCollection.withArgs(<DiagnosticCollection>{ name: 'fakeDiagnosticCollection' }).calledOnce);
    });

    it('Start language server without sign-in', async () => {
        const stubCredential = sinon.stub(fakedCredential, 'signInStatus').get(() => {
            return 'Initializing';
        });
        await buildController.startDocfxLanguageServer();
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new StartLanguageServerCompleted(
                false,
                new DocsError(
                    `Microsoft employees must sign in before validating.`,
                    ErrorCode.TriggerBuildBeforeSignIn
                ))
        ]);
        stubCredential.restore();
    });

    it('Start language server when credential expires', async () => {
        const opBuildAPIClient = <OPBuildAPIClient>{
            validateCredential: (opBuildUserToken: string, eventStream: EventStream): Promise<boolean> => {
                return new Promise((resolve, reject) => {
                    resolve(false);
                });
            }
        };
        buildController = new BuildController(getFakedBuildExecutor(DocfxExecutionResult.Succeeded), opBuildAPIClient, undefined, fakeEnvironmentController, eventStream, fakedCredentialController);
        await buildController.startDocfxLanguageServer();
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new CredentialExpired(),
            new StartLanguageServerCompleted(
                false,
                new DocsError(
                    `Credential has expired. Please sign in again to continue.`,
                    ErrorCode.TriggerBuildWithCredentialExpired
                ))
        ]);
    });
});