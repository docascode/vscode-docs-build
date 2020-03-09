import fs from 'fs-extra';
import path from 'path';
import extensionConfig from '../config';
import { PlatformInformation } from '../common/platformInformation';
import { ChildProcess } from 'child_process';
import { Package, AbsolutePathPackage } from '../dependency/package';
import { DocfxBuildStarted, DocfxRestoreStarted, DocfxBuildCompleted, DocfxRestoreCompleted} from '../common/loggingEvents';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { executeDocfx } from '../utils/childProcessUtils';
import { basicAuth, getDurationInSeconds, killProcessTree } from '../utils/utils';
import { ExtensionContext } from '../extensionContext';
import { DocfxExecutionResult, BuildResult } from './buildResult';
import { BuildInput } from './buildInput';
import { OUTPUT_FOLDER_NAME } from '../shared';
import config from '../config';
import TelemetryReporter from '../telemetryReporter';

export class BuildExecutor {
    private cwd: string;
    private binary: string;
    private runningChildProcess: ChildProcess;
    private static skipRestore: boolean = false;

    constructor(
        context: ExtensionContext,
        private platformInfo: PlatformInformation,
        private environmentController: EnvironmentController,
        private eventStream: EventStream,
        private telemetryReporter: TelemetryReporter
    ) {
        let runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
        let buildPackage = runtimeDependencies.find((pkg: Package) => pkg.name === 'docfx' && pkg.rid === this.platformInfo.rid);
        let absolutePackage = AbsolutePathPackage.getAbsolutePathPackage(buildPackage, context.extensionPath);
        this.cwd = absolutePackage.installPath.value;
        this.binary = absolutePackage.binary;
    }

    public async RunBuild(correlationId: string, input: BuildInput, buildUserToken: string): Promise<BuildResult> {
        let buildResult = <BuildResult>{
            result: DocfxExecutionResult.Succeeded,
            isRestoreSkipped: BuildExecutor.skipRestore
        };

        let outputPath = path.join(input.localRepositoryPath, OUTPUT_FOLDER_NAME);
        fs.emptyDirSync(outputPath);

        let envs: any = {
            'DOCFX_CORRELATION_ID': correlationId,
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this.environmentController.env
        };
        if (this.telemetryReporter.getUserOptIn()) {
            // TODO: docfx need to support more common properties, e.g. if it is local build or server build
            envs['APPINSIGHTS_INSTRUMENTATIONKEY'] = config.AIKey[this.environmentController.env];
        }

        if (!BuildExecutor.skipRestore) {
            let restoreStart = Date.now();
            let result = await this.restore(correlationId, input.localRepositoryPath, outputPath, buildUserToken, envs);
            if (result !== 'Succeeded') {
                buildResult.result = result;
                return buildResult;
            }
            BuildExecutor.skipRestore = true;
            buildResult.restoreTimeInSeconds = getDurationInSeconds(Date.now() - restoreStart);
        }

        let buildStart = Date.now();
        buildResult.result = await this.build(input.localRepositoryPath, outputPath, envs);
        buildResult.buildTimeInSeconds = getDurationInSeconds(Date.now() - buildStart);
        return buildResult;
    }

    public async cancelBuild() {
        if (this.runningChildProcess) {
            this.runningChildProcess.kill('SIGKILL');
            if (this.platformInfo.isWindows()) {
                // For Windows, grand child process will still keep running even parent process has been killed.
                // So we need to kill them manually
                await killProcessTree(this.runningChildProcess.pid);
            }
        }
    }

    private async restore(
        correlationId: string,
        repositoryPath: string,
        outputPath: string,
        buildUserToken: string,
        envs: any): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            let secrets = <any>{
                [`${extensionConfig.OPBuildAPIEndPoint[this.environmentController.env]}`]: {
                    "headers": {
                        "X-OP-BuildUserToken": buildUserToken
                    }
                }
            };
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
            this.eventStream.post(new DocfxRestoreStarted());
            let command = `${this.binary} restore "${repositoryPath}" --legacy --output "${outputPath}" --stdin`;
            this.runningChildProcess = executeDocfx(
                command,
                this.eventStream,
                (code: number, signal: string) => {
                    let docfxExecutionResult: DocfxExecutionResult;
                    if (signal === 'SIGKILL') {
                        docfxExecutionResult = DocfxExecutionResult.Canceled;
                    } else if (code === 0) {
                        docfxExecutionResult = DocfxExecutionResult.Succeeded;
                    } else {
                        docfxExecutionResult = DocfxExecutionResult.Failed;
                    }
                    this.eventStream.post(new DocfxRestoreCompleted(correlationId, docfxExecutionResult, code));
                    resolve(docfxExecutionResult);
                },
                { env: envs, cwd: this.cwd },
                stdinInput
            );
        });
    }

    private async build(
        repositoryPath: string,
        outputPath: string,
        envs: any): Promise<DocfxExecutionResult> {
        return new Promise((resolve, reject) => {
            this.eventStream.post(new DocfxBuildStarted());
            let command = `${this.binary} build "${repositoryPath}" --legacy --dry-run --output "${outputPath}"`;
            this.runningChildProcess = executeDocfx(
                command,
                this.eventStream,
                (code: number, signal: string) => {
                    let docfxExecutionResult: DocfxExecutionResult;
                    if (signal === 'SIGKILL') {
                        docfxExecutionResult = DocfxExecutionResult.Canceled;
                    } else if (code === 0) {
                        docfxExecutionResult = DocfxExecutionResult.Succeeded;
                    } else {
                        docfxExecutionResult = DocfxExecutionResult.Failed;
                    }
                    this.eventStream.post(new DocfxBuildCompleted(docfxExecutionResult, code));
                    resolve(docfxExecutionResult);
                },
                { env: envs, cwd: this.cwd }
            );
        });
    }
}