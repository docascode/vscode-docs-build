import * as fs from 'fs-extra';
import extensionConfig from '../config';
import { PlatformInformation } from '../common/platformInformation';
import { ChildProcess } from 'child_process';
import { Package, AbsolutePathPackage } from '../dependency/package';
import { DocfxRestoreCanceled, DocfxRestoreFailed, DocfxRestoreSucceeded, DocfxBuildCanceled, DocfxBuildSucceeded, DocfxBuildFailed, DocfxBuildStarted, DocfxRestoreStarted } from '../common/loggingEvents';
import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { executeDocfx } from '../utils/childProcessUtils';
import { basicAuth } from '../utils/utils';
import { ExtensionContext } from '../extensionContext';

export class BuildExecutor {
    private cwd: string;
    private binary: string;
    private runningChildProcess: ChildProcess;
    private static skipRestore: boolean;

    constructor(context: ExtensionContext, platformInfo: PlatformInformation, private environmentController: EnvironmentController, private eventStream: EventStream) {
        let runtimeDependencies = <Package[]>context.packageJson.runtimeDependencies;
        let buildPackage = runtimeDependencies.find((pkg: Package) => pkg.name === 'docfx' && pkg.rid === platformInfo.rid);
        let absolutePackage = AbsolutePathPackage.getAbsolutePathPackage(buildPackage, context.extensionPath);
        this.cwd = absolutePackage.installPath.value;
        this.binary = absolutePackage.binary;
    }

    public async RunBuild(
        repositoryPath: string,
        repositoryUrl: string,
        outputPath: string,
        buildUserToken: string
    ): Promise<boolean> {

        fs.emptyDirSync(outputPath);

        let envs = {
            'DOCFX_REPOSITORY_URL': repositoryUrl,
            'DOCS_ENVIRONMENT': this.environmentController.env
        };

        if (!BuildExecutor.skipRestore) {
            if (!(await this.restore(repositoryPath, outputPath, buildUserToken, envs))) {
                return false;
            }
            BuildExecutor.skipRestore = true;
        }

        return await this.build(repositoryPath, outputPath, envs);
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
        envs: any): Promise<boolean> {
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
                        this.eventStream.post(new DocfxRestoreCanceled());
                        resolve(false);
                    }
                    if (code === 0) {
                        this.eventStream.post(new DocfxRestoreSucceeded());
                        resolve(true);
                    } else {
                        this.eventStream.post(new DocfxRestoreFailed(code));
                        resolve(false);
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
        envs: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.eventStream.post(new DocfxBuildStarted());
            let command = `${this.binary} build "${repositoryPath}" --legacy --dry-run --output "${outputPath}"`;
            this.runningChildProcess = executeDocfx(
                command,
                this.eventStream,
                (code: number, signal: string) => {
                    if (signal === 'SIGKILL') {
                        this.eventStream.post(new DocfxBuildCanceled());
                        resolve(false);
                    }
                    if (code === 0) {
                        this.eventStream.post(new DocfxBuildSucceeded());
                        resolve(true);
                    } else {
                        this.eventStream.post(new DocfxBuildFailed(code));
                        resolve(false);
                    }
                },
                { env: envs, cwd: this.cwd }
            );
        });
    }
}