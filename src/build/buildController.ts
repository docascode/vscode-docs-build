import vscode from 'vscode';
import fs from 'fs-extra';
import path from 'path';
import { Credential } from '../credential/credentialController';
import { OPBuildAPIClient } from './opBuildAPIClient';
import { EventStream } from '../common/eventStream';
import { DiagnosticController } from './diagnosticController';
import { safelyReadJsonFile, getRepositoryInfoFromLocalFolder, getDurationInSeconds } from '../utils/utils';
import { EnvironmentController } from '../common/environmentController';
import { BuildExecutor } from './buildExecutor';
import { PlatformInformation } from '../common/platformInformation';
import { OP_CONFIG_FILE_NAME } from '../shared';
import { visualizeBuildReport } from './reportGenerator';
import { BuildInstantAllocated, BuildInstantReleased, BuildProgress, RepositoryInfoRetrieved, BuildTriggered, BuildFailed, BuildStarted, BuildSucceeded, BuildCanceled, CancelBuildTriggered, CancelBuildSucceeded, CancelBuildFailed } from '../common/loggingEvents';
import { ExtensionContext } from '../extensionContext';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { BuildInput, BuildType } from './buildInput';
import { DocfxExecutionResult } from './buildResult';
import TelemetryReporter from '../telemetryReporter';

export class BuildController {
    private activeWorkSpaceFolder: vscode.WorkspaceFolder;
    private opBuildAPIClient: OPBuildAPIClient;
    private buildExecutor: BuildExecutor;
    private currentBuildCorrelationId: string;

    public instantAvailable: boolean;

    constructor(
        context: ExtensionContext,
        environmentController: EnvironmentController,
        platformInformation: PlatformInformation,
        telemetryReporter: TelemetryReporter,
        private diagnosticController: DiagnosticController,
        private eventStream: EventStream,
    ) {
        this.instantAvailable = true;

        this.opBuildAPIClient = new OPBuildAPIClient(environmentController);
        this.buildExecutor = new BuildExecutor(context, platformInformation, environmentController, eventStream, telemetryReporter);
    }

    public async build(correlationId: string, uri: vscode.Uri, credential: Credential): Promise<void> {
        let buildInput: BuildInput;
        this.eventStream.post(new BuildTriggered(correlationId));
        let start = Date.now();

        try {
            buildInput = await this.getBuildInput(uri, credential);
            this.setAvailableFlag();
        } catch (err) {
            this.eventStream.post(new BuildFailed(correlationId, buildInput, getTotalTimeInSeconds(), err));
            return;
        }

        try {
            this.currentBuildCorrelationId = correlationId;
            this.eventStream.post(new BuildStarted(this.activeWorkSpaceFolder.name));
            let buildResult = await this.buildExecutor.RunBuild(correlationId, buildInput, credential.userInfo.userToken);
            // TODO: For multiple docset repo, we still need to generate report if one docset build crashed
            switch (buildResult.result) {
                case DocfxExecutionResult.Succeeded:
                    visualizeBuildReport(buildInput.localRepositoryPath, this.diagnosticController, this.eventStream);
                    this.eventStream.post(new BuildSucceeded(correlationId, buildInput, getTotalTimeInSeconds(), buildResult));
                    break;
                case DocfxExecutionResult.Canceled:
                    this.eventStream.post(new BuildCanceled(correlationId, buildInput, getTotalTimeInSeconds()));
                    break;
                case DocfxExecutionResult.Failed:
                    throw new DocsError('Running docfx failed', ErrorCode.RunDocfxFailed);
            }
        }
        catch (err) {
            this.eventStream.post(new BuildFailed(correlationId, buildInput, getTotalTimeInSeconds(), err));
        }
        finally {
            this.currentBuildCorrelationId = undefined;
            this.resetAvailableFlag();
        }

        function getTotalTimeInSeconds() {
            return getDurationInSeconds(Date.now() - start);
        }
    }

    public cancelBuild(correlationId: string): void {
        try {
            this.eventStream.post(new CancelBuildTriggered(correlationId));
            if (!this.instantAvailable) {
                this.buildExecutor.cancelBuild();
            }
            this.eventStream.post(new CancelBuildSucceeded(correlationId, this.currentBuildCorrelationId));
        } catch (err) {
            this.eventStream.post(new CancelBuildFailed(correlationId, this.currentBuildCorrelationId, err));
        }
    }

    private setAvailableFlag() {
        if (!this.instantAvailable) {
            throw new DocsError('Last build has not finished.', ErrorCode.TriggerBuildWhenInstantNotAvailable);
        }
        this.instantAvailable = false;
        this.eventStream.post(new BuildInstantAllocated());
    }

    private resetAvailableFlag() {
        this.instantAvailable = true;
        this.eventStream.post(new BuildInstantReleased());
    }

    private async getBuildInput(uri: vscode.Uri, credential: Credential): Promise<BuildInput> {
        if (uri) {
            // Trigger build from the right click the workspace file.
            this.activeWorkSpaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        } else if (!this.activeWorkSpaceFolder) {
            // Trigger build from command palette or click the status bar
            let workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                if (workspaceFolders.length > 1) {
                    // TODO: Display a command palette to let user select the target workspace folder.
                    throw new DocsError(
                        'Multiple workspace folders are opened. Please right click any file inside the target workspace folder to trigger the build',
                        ErrorCode.TriggerBuildWithoutSpecificWorkspace
                    );
                }
                this.activeWorkSpaceFolder = workspaceFolders[0];
            }
        }

        // Check the workspace is a valid Docs repository
        await this.validateWorkSpaceFolder(this.activeWorkSpaceFolder);
        let localRepositoryPath = this.activeWorkSpaceFolder.uri.fsPath;

        // Check user sign in status
        if (credential.signInStatus !== 'SignedIn') {
            throw new DocsError('You have to sign-in firstly', ErrorCode.TriggerBuildBeforeSignedIn);
        }

        try {
            let [localRepositoryUrl, originalRepositoryUrl] = await this.retrieveRepositoryInfo(localRepositoryPath, credential.userInfo.userToken);
            return <BuildInput>{
                buildType: BuildType.FullBuild,
                localRepositoryPath,
                localRepositoryUrl,
                originalRepositoryUrl,
            };
        } catch (err) {
            throw new DocsError(
                err.message,
                ErrorCode.TriggerBuildOnInvalidDocsRepo
            );
        }
    }

    private async validateWorkSpaceFolder(workspaceFolder: vscode.WorkspaceFolder) {
        if (!workspaceFolder) {
            throw new DocsError(
                'You can only trigger the build on a workspace folder.',
                ErrorCode.TriggerBuildOnNonWorkspace
            );
        }

        let opConfigPath = path.join(workspaceFolder.uri.fsPath, OP_CONFIG_FILE_NAME);
        if (!fs.existsSync(opConfigPath)) {
            throw new DocsError(
                `Cannot find '${OP_CONFIG_FILE_NAME}' file under current workspace folder.`,
                ErrorCode.TriggerBuildOnNonDocsRepo
            );
        }

        let opConfig = safelyReadJsonFile(opConfigPath);
        if (!opConfig.docs_build_engine || opConfig.docs_build_engine.name !== 'docfx_v3') {
            throw new DocsError(
                'Docs Build requires the repository enable DocFX v3',
                ErrorCode.TriggerBuildOnV2Repo,
                undefined,
                [opConfigPath]
            );
        }

        return true;
    }

    private async retrieveRepositoryInfo(localRepositoryPath: string, buildUserToken: string): Promise<string[]> {
        this.eventStream.post(new BuildProgress('Retrieving repository information for the current workspace folder...'));

        let localRepositoryUrl: string;
        try {
            [, localRepositoryUrl] = await getRepositoryInfoFromLocalFolder(localRepositoryPath);
        } catch (err) {
            throw new Error(`Cannot get the repository information for the current workspace folder(${err.message})`);
        }

        let originalRepositoryUrl = await this.opBuildAPIClient.getOriginalRepositoryUrl(localRepositoryUrl, buildUserToken, this.eventStream);

        this.eventStream.post(new RepositoryInfoRetrieved(localRepositoryUrl, originalRepositoryUrl));
        return [localRepositoryUrl, originalRepositoryUrl];
    }
}