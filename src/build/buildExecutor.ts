import extensionConfig from '../config';
import { PlatformInformation } from '../common/platformInformation';
import { ChildProcess } from 'child_process';
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

interface BuildParameters {
    restoreCommand: string;
    buildCommand: string;
    envs: any;
    stdin: string;
}

export class BuildExecutor {
    private _cwd: string;
    private _binary: string;
    private _runningChildProcess: ChildProcess;
    private static SKIP_RESTORE: boolean = false;

    constructor(
        context: ExtensionContext,
        private _platformInfo: PlatformInformation,
        private _environmentController: EnvironmentController,
        private _eventStream: EventStream,
        private _telemetryReporter: TelemetryReporter
    ) {
        let runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
        let buildPackage = runtimeDependencies.find((pkg: Package) => pkg.name === 'docfx' && pkg.rid === this._platformInfo.rid);
        let absolutePackage = AbsolutePathPackage.getAbsolutePathPackage(buildPackage, context.extensionPath);
        this._cwd = absolutePackage.installPath.value;
        this._binary = absolutePackage.binary;
    }

    public async RunBuild(correlationId: string, input: BuildInput, buildUserToken: string): Promise<BuildResult> {
        let buildResult = <BuildResult>{
            result: DocfxExecutionResult.Succeeded,
            isRestoreSkipped: BuildExecutor.SKIP_RESTORE
        };

        let buildParameters = this.getBuildParameters(correlationId, input, buildUserToken);

        if (!BuildExecutor.SKIP_RESTORE) {
            let restoreStart = Date.now();
            let result = await this.restore(correlationId, buildParameters);
            if (result !== 'Succeeded') {
                buildResult.result = result;
                return buildResult;
            }
            BuildExecutor.SKIP_RESTORE = true;
            buildResult.restoreTimeInSeconds = getDurationInSeconds(Date.now() - restoreStart);
        }

        let buildStart = Date.now();
        buildResult.result = await this.build(buildParameters);
        buildResult.buildTimeInSeconds = getDurationInSeconds(Date.now() - buildStart);
        return buildResult;
    }

    public async cancelBuild() {
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
                buildParameters.stdin
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
                buildParameters.stdin
            );
        });
    }

    private getBuildParameters(
        correlationId: string,
        input: BuildInput,
        buildUserToken: string,
    ): BuildParameters {
        let envs: any = {
            'DOCFX_CORRELATION_ID': correlationId,
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this._environmentController.env
        };

        let isPublicUser = !buildUserToken;
        if (isPublicUser) {
            envs['DOCFX_REPOSITORY_BRANCH'] = 'master';
        }

        if (this._telemetryReporter.getUserOptIn()) {
            // TODO: docfx need to support more common properties, e.g. if it is local build or server build
            envs['APPINSIGHTS_INSTRUMENTATIONKEY'] = config.AIKey[this._environmentController.env];
        }

        let secrets = <any>{
        };

        if (!isPublicUser) {
            secrets[`${extensionConfig.OPBuildAPIEndPoint[this._environmentController.env]}`] = {
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
        let stdin = JSON.stringify({
            "http": secrets
        });

        return <BuildParameters>{
            envs,
            stdin,
            restoreCommand: this.getExecCommand("restore", input, isPublicUser),
            buildCommand: this.getExecCommand("build", input, isPublicUser)
        };
    }

    private getExecCommand(
        command: string,
        input: BuildInput,
        isPublicUser: boolean,
    ): string {
        let cmdWithParameters = `${this._binary} ${command} "${input.localRepositoryPath}" --log "${input.logPath}" --stdin`;
        cmdWithParameters += (isPublicUser ? ` --template "${config.PublicTemplate}"` : '');
        cmdWithParameters += (this._environmentController.debugMode ? ' --verbose' : '');
        cmdWithParameters += (command === "build" && input.dryRun ? ' --dry-run' : '');
        cmdWithParameters += (command === "build" ? ` --output "${input.outputFolderPath}"` : '');
        return cmdWithParameters;
    }
}