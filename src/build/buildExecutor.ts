import { Disposable } from 'vscode';
import { ChildProcess } from 'child_process';
import WebSocket from 'ws';
import {
    LanguageClient,
    StreamInfo
} from "vscode-languageclient/node";
import { PlatformInformation } from '../common/platformInformation';
import { Package, AbsolutePathPackage } from '../dependency/package';
import { DocfxBuildStarted, DocfxRestoreStarted, DocfxBuildCompleted, DocfxRestoreCompleted } from '../common/loggingEvents';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { executeDocfx } from '../utils/childProcessUtils';
import { basicAuth, getDurationInSeconds, killProcessTree } from '../utils/utils';
import { ExtensionContext } from '../extensionContext';
import { DocfxExecutionResult, BuildResult } from './buildResult';
import { BuildInput } from './buildInput';
import config from '../config';
import TelemetryReporter from '../telemetryReporter';
import { OP_BUILD_USER_TOKEN_HEADER_NAME, UserType } from '../shared';
import { CredentialExpiryHandler } from '../credential/credentialExpiryHandler';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';

interface BuildParameters {
    restoreCommand: string;
    buildCommand: string;
    serveCommand: string;
    envs: any;
}

export class BuildExecutor implements Disposable {
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

    async dispose(): Promise<void> {
        await this.killChildProcess(this._runningBuildChildProcess);
        await this.killChildProcess(this._runningLspChildProcess);
    }

    public async RunBuild(correlationId: string, input: BuildInput, buildUserToken: string): Promise<BuildResult> {
        const buildResult = <BuildResult>{
            result: DocfxExecutionResult.Succeeded,
            isRestoreSkipped: BuildExecutor.SKIP_RESTORE
        };

        const buildParameters = this.getBuildParameters(correlationId, input, buildUserToken);

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
            input
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
                            const ws = new WebSocket(`ws://localhost:${input.port}/lsp`);
                            const connection = WebSocket.createWebSocketStream(ws);
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
        await this.killChildProcess(this._runningBuildChildProcess);
    }

    private async killChildProcess(childProcess: ChildProcess) {
        if (childProcess) {
            childProcess.kill('SIGKILL');
            if (this._platformInfo.isWindows()) {
                // For Windows, grand child process will still keep running even parent process has been killed.
                // So we need to kill them manually
                await killProcessTree(childProcess.pid);
            }
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
    ): BuildParameters {
        const envs: any = {
            'DOCFX_CORRELATION_ID': correlationId,
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this._environmentController.env
        };

        const isPublicUser = this._environmentController.userType === UserType.PublicContributor;
        if (isPublicUser) {
            envs['DOCFX_REPOSITORY_BRANCH'] = 'master';
        }

        if (this._telemetryReporter.getUserOptIn()) {
            // TODO: docfx need to support more common properties, e.g. if it is local build or server build
            envs['APPINSIGHTS_INSTRUMENTATIONKEY'] = config.AIKey[this._environmentController.env];
        }

        const secrets = <any>{
        };

        if (!isPublicUser) {
            secrets[`${config.OPBuildAPIEndPoint[this._environmentController.env]}`] = {
                "headers": {
                    [OP_BUILD_USER_TOKEN_HEADER_NAME]: buildUserToken
                }
            };
        }
        if (process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN) {
            secrets["https://github.com"] = {
                "headers": {
                    "authorization": `basic ${basicAuth(process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN)}`
                }
            };
        }
        envs["DOCFX_HTTP"] = JSON.stringify(secrets);

        return <BuildParameters>{
            envs,
            restoreCommand: this.getExecCommand("restore", input, isPublicUser),
            buildCommand: this.getExecCommand("build", input, isPublicUser),
            serveCommand: this.getExecCommand("serve", input, isPublicUser),
        };
    }

    private getExecCommand(
        command: string,
        input: BuildInput,
        isPublicUser: boolean,
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
        }

        cmdWithParameters += (isPublicUser ? ` --template "${config.PublicTemplate}"` : '');
        cmdWithParameters += (this._environmentController.debugMode ? ' --verbose' : '');
        return cmdWithParameters;
    }
}