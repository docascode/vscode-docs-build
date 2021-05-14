import { ChildProcess } from 'child_process';
import path from 'path';
import { Duplex } from 'stream';
import vscode from 'vscode';
import {
    LanguageClient,
    StreamInfo
} from "vscode-languageclient/node";
import WebSocket from 'ws';

import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { DocfxBuildCompleted, DocfxBuildStarted, DocfxRestoreCompleted, DocfxRestoreStarted } from '../common/loggingEvents';
import { PlatformInformation } from '../common/platformInformation';
import config from '../config';
import { CredentialExpiryHandler } from '../credential/credentialExpiryHandler';
import { AbsolutePathPackage, Package } from '../dependency/package';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { ExtensionContext } from '../extensionContext';
import { OP_BUILD_USER_TOKEN_HEADER_NAME, UserType } from '../shared';
import TelemetryReporter from '../telemetryReporter';
import { executeDocfx, hardKillProcess, softKillProcess } from '../utils/childProcessUtils';
import { basicAuth, getDurationInSeconds } from '../utils/utils';
import { BuildInput } from './buildInput';
import { BuildResult, DocfxExecutionResult } from './buildResult';

interface BuildParameters {
    restoreCommand: string;
    buildCommand: string;
    serveCommand: string;
    envs: any;
}

export class BuildExecutor {
    private _cwd: string;
    private _binary: string;
    private _runningBuildChildProcess: ChildProcess;
    private _runningLspChildProcess: ChildProcess;
    private static SKIP_RESTORE = false;

    constructor(
        context: ExtensionContext,
        private _platformInfo: PlatformInformation,
        private _environmentController: EnvironmentController,
        private _eventStream: EventStream,
        private _telemetryReporter: TelemetryReporter
    ) {
        const runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
        const buildPackage = runtimeDependencies.find((pkg: Package) => pkg.name === 'docfx' && pkg.rid === this._platformInfo.rid);
        const absolutePackage = AbsolutePathPackage.getAbsolutePathPackage(buildPackage, context.extensionPath);
        this._cwd = process.env.LOCAL_ATTACH_DOCFX_FOLDER_PATH ? process.env.LOCAL_ATTACH_DOCFX_FOLDER_PATH : absolutePackage.installPath.value;
        this._binary = absolutePackage.binary;
    }

    async disposeAsync(): Promise<void> {
        await this.killChildProcess(this._runningBuildChildProcess);
        await this.killChildProcess(this._runningLspChildProcess);
    }

    public async RunBuild(correlationId: string, input: BuildInput, buildUserToken: string, buildSubFolder?: string): Promise<BuildResult> {
        const buildResult = <BuildResult>{
            result: DocfxExecutionResult.Succeeded,
            isRestoreSkipped: BuildExecutor.SKIP_RESTORE
        };

        const buildParameters = this.getBuildParameters(correlationId, input, buildUserToken, buildSubFolder);

        if (!BuildExecutor.SKIP_RESTORE) {
            const restoreStart = Date.now();
            const result = await this.restore(correlationId, buildParameters);
            if (result !== 'Succeeded') {
                buildResult.result = result;
                return buildResult;
            }
            BuildExecutor.SKIP_RESTORE = true;
            buildResult.restoreTimeInSeconds = getDurationInSeconds(Date.now() - restoreStart);
        }

        const buildStart = Date.now();
        buildResult.result = await this.build(buildParameters);
        buildResult.buildTimeInSeconds = getDurationInSeconds(Date.now() - buildStart);
        return buildResult;
    }

    public async getLanguageClient(input: BuildInput, buildUserToken: string): Promise<LanguageClient> {
        return new Promise((resolve, reject) => {
            const parameters = this.getBuildParameters(undefined, input, buildUserToken);
            let isServerReady = false;

            this._runningLspChildProcess = executeDocfx(
                parameters.serveCommand,
                this._eventStream,
                (code: number, signal: string) => {
                    reject(new DocsError('Running DocFX failed', ErrorCode.RunDocfxFailed));
                },
                { env: parameters.envs, cwd: this._cwd },
                (data) => {
                    if (!isServerReady) {
                        if (data.indexOf("Now listening on:") >= 0) {
                            isServerReady = true;
                            const connection = this.connectToServer(input.port);
                            const client = new LanguageClient(
                                "docfxLanguageServer",
                                "Docfx Language Server",
                                () => Promise.resolve<StreamInfo>({
                                    reader: connection,
                                    writer: connection,
                                }),
                                {});
                            client.registerProposedFeatures();
                            const credentialExpiryHandler = new CredentialExpiryHandler(client, this._eventStream, this._environmentController);
                            credentialExpiryHandler.listenCredentialExpiryRequest();
                            resolve(client);
                        }
                    }
                }
            );
        })
    }

    public async cancelBuild(): Promise<void> {
        await this.killChildProcess(this._runningBuildChildProcess, true);
    }

    private connectToServer(port: number): Duplex {
        const ws = new WebSocket(`ws://localhost:${port}/lsp`);
        return WebSocket.createWebSocketStream(ws);
    }

    private async killChildProcess(childProcess: ChildProcess, softKill = false): Promise<void> {
        if (childProcess) {
            softKill ? await softKillProcess(childProcess) : hardKillProcess(childProcess);
        }
    }

    private async restore(
        correlationId: string,
        buildParameters: BuildParameters): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxRestoreStarted());
            this._runningBuildChildProcess = executeDocfx(
                buildParameters.restoreCommand,
                this._eventStream,
                (code: number, signal: string) => {
                    let docfxExecutionResult: DocfxExecutionResult;
                    if (signal === 'SIGKILL') {
                        docfxExecutionResult = DocfxExecutionResult.Canceled;
                    } else if (code === 0) {
                        docfxExecutionResult = DocfxExecutionResult.Succeeded;
                    } else {
                        docfxExecutionResult = DocfxExecutionResult.Failed;
                    }
                    this._eventStream.post(new DocfxRestoreCompleted(correlationId, docfxExecutionResult, code));
                    this._runningBuildChildProcess = undefined;
                    resolve(docfxExecutionResult);
                },
                { env: buildParameters.envs, cwd: this._cwd },
            );
        });
    }

    private async build(buildParameters: BuildParameters): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxBuildStarted());
            this._runningBuildChildProcess = executeDocfx(
                buildParameters.buildCommand,
                this._eventStream,
                (code: number, signal: string) => {
                    let docfxExecutionResult: DocfxExecutionResult;
                    if (signal === 'SIGKILL') {
                        docfxExecutionResult = DocfxExecutionResult.Canceled;
                    } else if (code === 0 || code === 1) {
                        docfxExecutionResult = DocfxExecutionResult.Succeeded;
                    } else {
                        docfxExecutionResult = DocfxExecutionResult.Failed;
                    }
                    this._eventStream.post(new DocfxBuildCompleted(docfxExecutionResult, code));
                    this._runningBuildChildProcess = undefined;
                    resolve(docfxExecutionResult);
                },
                { env: buildParameters.envs, cwd: this._cwd },
            );
        });
    }

    private getBuildParameters(
        correlationId: string,
        input: BuildInput,
        buildUserToken: string,
        buildSubFolder?: string,
    ): BuildParameters {
        const envs: any = {
            'DOCFX_CORRELATION_ID': correlationId,
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this._environmentController.env,
            'DOCFX_SESSION_ID': vscode.env.sessionId,
            'DOCS_PPOD_SERVICE_ENDPOINT': config.OPBuildAPIEndPoint.PROD,
            'DOCS_PPE_SERVICE_ENDPOINT': config.OPBuildAPIEndPoint.PPE,
        };

        const isPublicUser = this._environmentController.userType === UserType.PublicContributor;
        if (isPublicUser) {
            envs['DOCFX_REPOSITORY_BRANCH'] = 'master';
        }

        if (this._telemetryReporter.getUserOptIn()) {
            // TODO: docfx need to support more common properties, e.g. if it is local build or server build
            envs['APPINSIGHTS_INSTRUMENTATIONKEY'] = config.AIKey[this._environmentController.env];
        }

        const http = <any>{
        };

        if (!isPublicUser) {
            http[`${config.OPBuildAPIEndPoint[this._environmentController.env]}`] = {
                "headers": {
                    [OP_BUILD_USER_TOKEN_HEADER_NAME]: buildUserToken
                }
            };
        }
        if (process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN) {
            http["https://github.com"] = {
                "headers": {
                    "authorization": `basic ${basicAuth(process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN)}`
                }
            };
        }
        envs["DOCFX_SECRETS"] = JSON.stringify({ http });

        return <BuildParameters>{
            envs,
            restoreCommand: this.getExecCommand("restore", input, isPublicUser, buildSubFolder),
            buildCommand: this.getExecCommand("build", input, isPublicUser, buildSubFolder),
            serveCommand: this.getExecCommand("serve", input, isPublicUser, buildSubFolder),
        };
    }

    private getExecCommand(
        command: string,
        input: BuildInput,
        isPublicUser: boolean,
        buildSubFolder?: string,
    ): string {
        let cmdWithParameters = `${this._binary} ${command} "${input.localRepositoryPath}"`;
        if (command === 'serve') {
            cmdWithParameters += ` --language-server --no-cache --address "localhost" --port ${input.port}`;
        } else {
            cmdWithParameters += ` --log "${input.logPath}"`;
        }
        if (command === 'build') {
            if (input.dryRun) {
                cmdWithParameters += ' --dry-run';
            }
            cmdWithParameters += ` --output "${input.outputFolderPath}" --output-type "pagejson"`;
            if (buildSubFolder) {
                cmdWithParameters += ` --file "${path.normalize(path.join(buildSubFolder, "**"))}"`;
            }
        }

        cmdWithParameters += (isPublicUser ? ` --template "${config.PublicTemplate}"` : '');
        cmdWithParameters += (this._environmentController.debugMode ? ' --verbose' : '');
        return cmdWithParameters;
    }
}