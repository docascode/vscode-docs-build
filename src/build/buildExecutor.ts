import * as fs from 'fs-extra';
import * as path from 'path';
import extensionConfig from '../config';
import { PlatformInformation } from '../common/platformInformation';
import { ChildProcess } from 'child_process';
import { Package, AbsolutePathPackage } from '../dependency/package';
import { DocfxBuildStarted, DocfxRestoreStarted, DocfxBuildCompleted, DocfxRestoreCompleted } from '../common/loggingEvents';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { executeDocfx } from '../utils/childProcessUtils';
import { basicAuth, getDurationInSeconds } from '../utils/utils';
import { ExtensionContext } from '../extensionContext';
import { DocfxExecutionResult, BuildResult } from './buildResult';
import { BuildInput } from './buildInput';
import { OUTPUT_FOLDER_NAME } from '../shared';

export class BuildExecutor {
    private cwd: string;
    private binary: string;
    private runningChildProcess: ChildProcess;
    private static skipRestore: boolean = false;

    constructor(context: ExtensionContext, platformInfo: PlatformInformation, private environmentController: EnvironmentController, private eventStream: EventStream) {
        let runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
        let buildPackage = runtimeDependencies.find((pkg: Package) => pkg.name === 'docfx' && pkg.rid === platformInfo.rid);
        let absolutePackage = AbsolutePathPackage.getAbsolutePathPackage(buildPackage, context.extensionPath);
        this.cwd = absolutePackage.installPath.value;
        this.binary = absolutePackage.binary;
    }

    public async RunBuild(input: BuildInput, buildUserToken: string): Promise<BuildResult> {
        let buildResult = <BuildResult>{
            result: 'Succeeded',
            isRestoreSkipped: BuildExecutor.skipRestore
        };

        let outputPath = path.join(input.localRepositoryPath, OUTPUT_FOLDER_NAME);
        fs.emptyDirSync(outputPath);

        let envs = {
            'DOCFX_REPOSITORY_URL': input.originalRepositoryUrl,
            'DOCS_ENVIRONMENT': this.environmentController.env
        };

        if (!BuildExecutor.skipRestore) {
            let restoreStart = Date.now();
            let result = await this.restore(input.localRepositoryPath, outputPath, buildUserToken, envs);
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

    public cancelBuild(): void {
        if (this.runningChildProcess) {
            this.runningChildProcess.kill('SIGKILL');
        }
    }

    private async restore(
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
                    if (signal === 'SIGKILL') {
                        this.eventStream.post(new DocfxRestoreCompleted('Canceled'));
                        resolve('Canceled');
                    } else if (code === 0) {
                        this.eventStream.post(new DocfxRestoreCompleted('Succeeded', 0));
                        resolve('Succeeded');
                    } else {
                        this.eventStream.post(new DocfxRestoreCompleted('Failed', code));
                        resolve('Failed');
                    }
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
                    if (signal === 'SIGKILL') {
                        this.eventStream.post(new DocfxBuildCompleted('Canceled'));
                        resolve('Canceled');
                    } else if (code === 0) {
                        this.eventStream.post(new DocfxBuildCompleted('Succeeded', 0));
                        resolve('Succeeded');
                    } else {
                        this.eventStream.post(new DocfxBuildCompleted('Failed', code));
                        resolve('Failed');
                    }
                },
                { env: envs, cwd: this.cwd }
            );
        });
    }
}