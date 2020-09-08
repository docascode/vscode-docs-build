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

        let [envs, stdinInput] = this.getBuildParameters(correlationId, input, buildUserToken);

        if (!BuildExecutor.SKIP_RESTORE) {
            let restoreStart = Date.now();
            let result = await this.restore(correlationId, input.localRepositoryPath, input.logPath, envs, stdinInput);
            if (result !== 'Succeeded') {
                buildResult.result = result;
                return buildResult;
            }
            BuildExecutor.SKIP_RESTORE = true;
            buildResult.restoreTimeInSeconds = getDurationInSeconds(Date.now() - restoreStart);
        }

        let buildStart = Date.now();
        buildResult.result = await this.build(input.localRepositoryPath, input.outputFolderPath, input.logPath, input.dryRun, envs, stdinInput);
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

    private getBuildParameters(correlationId: string, input: BuildInput, buildUserToken: string): [any, string] {
        let envs: any = {
            'DOCFX_CORRELATION_ID': correlationId,
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this._environmentController.env
        };
        if (this._telemetryReporter.getUserOptIn()) {
            // TODO: docfx need to support more common properties, e.g. if it is local build or server build
            envs['APPINSIGHTS_INSTRUMENTATIONKEY'] = config.AIKey[this._environmentController.env];
        }

        let secrets = <any>{
        };

        if (buildUserToken) {
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
        let stdinInput = JSON.stringify({
            "http": secrets
        });
        return [envs, stdinInput];
    }

    private async restore(
        correlationId: string,
        repositoryPath: string,
        logPath: string,
        envs: any,
        stdinInput: string): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxRestoreStarted());
            let command = `${this._binary} restore "${repositoryPath}" --legacy --log "${logPath}" --stdin`;
            command += (this._environmentController.debugMode ? ' --verbose' : '');
            this._runningChildProcess = executeDocfx(
                command,
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
                { env: envs, cwd: this._cwd },
                stdinInput
            );
        });
    }

    private async build(
        repositoryPath: string,
        outputPath: string,
        logPath: string,
        dryRun: boolean,
        envs: any,
        stdinInput: string): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this._eventStream.post(new DocfxBuildStarted());
            let command = `${this._binary} build "${repositoryPath}" --legacy --output "${outputPath}" --log "${logPath}" --stdin`;
            command += (this._environmentController.debugMode ? ' --verbose' : '');
            command += (dryRun ? ' --dry-run' : '');
            this._runningChildProcess = executeDocfx(
                command,
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
                { env: envs, cwd: this._cwd },
                stdinInput
            );
        });
    }
}