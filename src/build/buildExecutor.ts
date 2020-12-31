import { PlatformInformation } from '../common/platformInformation';
import { ChildProcess } from 'child_process';
import { Package, AbsolutePathPackage } from '../dependency/package';
import { DocfxBuildStarted, DocfxRestoreStarted, DocfxBuildCompleted, DocfxRestoreCompleted, BuildProgress } from '../common/loggingEvents';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { executeDocfx } from '../utils/childProcessUtils';
import { basicAuth, getDurationInSeconds, killProcessTree } from '../utils/utils';
import { ExtensionContext } from '../extensionContext';
import { DocfxExecutionResult, BuildResult } from './buildResult';
import { BuildInput } from './buildInput';
import config from '../config';
import TelemetryReporter from '../telemetryReporter';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    Disposable
} from "vscode-languageclient/node";
import { UserType } from '../shared';

interface BuildParameters {
    restoreCommand: string;
    buildCommand: string;
    serveCommand: string;
    envs: any;
}

export class BuildExecutor {
    private _cwd: string;
    private _binary: string;
    private _runningChildProcess: ChildProcess;
    private static SKIP_RESTORE = false;
    private _disposable: Disposable;

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

    dispose(): void {
        if (this._disposable) {
            this._disposable.dispose();
        }
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

    public startLanguageServer(input: BuildInput, buildUserToken: string): void {
        const buildParameters = this.getBuildParameters(undefined, input, buildUserToken);
        if (this._environmentController.userType === UserType.MicrosoftEmployee) {
            buildParameters.envs['DOCS_OPS_TOKEN'] = buildUserToken;
        }
        const command = this._binary;
        const args = buildParameters.serveCommand.split(" ");
        args.forEach((arg, i) => args[i] = arg.replace(/^["'](.+(?=["']$))["']$/, '$1'));

        const options = { env: buildParameters.envs, cwd: this._cwd };
        const optionsWithFullEnvironment = {
            ...options,
            env: {
                ...process.env,
                ...options.env
            }
        };
        const serverOptions: ServerOptions = {
            run: {
                command,
                args,
                options: optionsWithFullEnvironment
            },
            debug: {
                command,
                args,
                options: optionsWithFullEnvironment
            },
        };

        const clientOptions: LanguageClientOptions = {};

        this._eventStream.post(new BuildProgress(`Starting language server using command: ${command} ${buildParameters.serveCommand}`));
        const client = new LanguageClient("docfxLanguageServer", "Docfx Language Server", serverOptions, clientOptions);
        client.registerProposedFeatures();
        this._disposable = client.start();
    }

    public async cancelBuild(): Promise<void> {
        if (this._runningChildProcess) {
            this._runningChildProcess.kill('SIGKILL');
            if (this._platformInfo.isWindows()) {
                // For Windows, grand child process will still keep running even parent process has been killed.
                // So we need to kill them manually
                await killProcessTree(this._runningChildProcess.pid);
            }
        }
    }

    private async restore(
        correlationId: string,
        buildParameters: BuildParameters): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxRestoreStarted());
            this._runningChildProcess = executeDocfx(
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
            this._runningChildProcess = executeDocfx(
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
                    "X-OP-BuildUserToken": buildUserToken
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
            serveCommand: this.getExecCommand("serve", input, isPublicUser)
        };
    }

    private getExecCommand(
        command: string,
        input: BuildInput,
        isPublicUser: boolean,
    ): string {
        let cmdWithParameters: string;
        if (command === 'serve') {
            cmdWithParameters = `${command} --language-server "${input.localRepositoryPath}"`;
        } else {
            cmdWithParameters = `${this._binary} ${command} "${input.localRepositoryPath}" --log "${input.logPath}"`;
        }
        cmdWithParameters += (isPublicUser ? ` --template "${config.PublicTemplate}"` : '');
        cmdWithParameters += (this._environmentController.debugMode ? ' --verbose' : '');

        if (command === 'build') {
            if (input.dryRun) {
                cmdWithParameters += ' --dry-run';
            }
            cmdWithParameters += ` --output "${input.outputFolderPath}" --output-type "pagejson"`;
        }
        return cmdWithParameters;
    }
}