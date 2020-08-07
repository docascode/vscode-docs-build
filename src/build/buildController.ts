import vscode from 'vscode';
import fs from 'fs-extra';
import path from 'path';
import { Credential } from '../credential/credentialController';
import { OPBuildAPIClient } from './opBuildAPIClient';
import { EventStream } from '../common/eventStream';
import { DiagnosticController } from './diagnosticController';
import { safelyReadJsonFile, getRepositoryInfoFromLocalFolder, getDurationInSeconds, getRandomOutputFolder, normalizeDriveLetter } from '../utils/utils';
import { BuildExecutor } from './buildExecutor';
import { OP_CONFIG_FILE_NAME } from '../shared';
import { visualizeBuildReport } from './reportGenerator';
import { BuildInstantAllocated, BuildInstantReleased, BuildProgress, RepositoryInfoRetrieved, BuildTriggered, BuildFailed, BuildStarted, BuildSucceeded, BuildCanceled, CancelBuildTriggered, CancelBuildSucceeded, CancelBuildFailed } from '../common/loggingEvents';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { BuildInput, BuildType } from './buildInput';
import { DocfxExecutionResult } from './buildResult';

export class BuildController {
    private _activeWorkSpaceFolder: vscode.WorkspaceFolder;
    private _currentBuildCorrelationId: string;
    private _instanceAvailable: boolean;

    constructor(
        private _buildExecutor: BuildExecutor,
        private _opBuildAPIClient: OPBuildAPIClient,
        private _diagnosticController: DiagnosticController,
        private _eventStream: EventStream,
    ) {
        this._instanceAvailable = true;
    }

    public get instanceAvailable(): boolean {
        return this._instanceAvailable;
    }

    public async build(correlationId: string, uri: vscode.Uri, credential: Credential): Promise<void> {
        let buildInput: BuildInput;
        this._eventStream.post(new BuildTriggered(correlationId));
        let start = Date.now();

        try {
            buildInput = await this.getBuildInput(uri, credential);
            this.setAvailableFlag();
        } catch (err) {
            this._eventStream.post(new BuildFailed(correlationId, buildInput, getTotalTimeInSeconds(), err));
            return;
        }

        try {
            this._currentBuildCorrelationId = correlationId;
            this._eventStream.post(new BuildStarted(this._activeWorkSpaceFolder.name));
            let buildResult = await this._buildExecutor.RunBuild(correlationId, buildInput, credential.userInfo.userToken);
            // TODO: For multiple docset repo, we still need to generate report if one docset build crashed
            switch (buildResult.result) {
                case DocfxExecutionResult.Succeeded:
                    visualizeBuildReport(buildInput.localRepositoryPath, buildInput.outputFolderPath, this._diagnosticController, this._eventStream);
                    this._eventStream.post(new BuildSucceeded(correlationId, buildInput, getTotalTimeInSeconds(), buildResult));
                    break;
                case DocfxExecutionResult.Canceled:
                    this._eventStream.post(new BuildCanceled(correlationId, buildInput, getTotalTimeInSeconds()));
                    break;
                case DocfxExecutionResult.Failed:
                    throw new DocsError('Running DocFX failed', ErrorCode.RunDocfxFailed);
            }
        }
        catch (err) {
            this._eventStream.post(new BuildFailed(correlationId, buildInput, getTotalTimeInSeconds(), err));
        }
        finally {
            this._currentBuildCorrelationId = undefined;
            fs.removeSync(buildInput.outputFolderPath);
            this.resetAvailableFlag();
        }

        function getTotalTimeInSeconds() {
            return getDurationInSeconds(Date.now() - start);
        }
    }

    public cancelBuild(): void {
        if (!this._instanceAvailable) {
            try {
                this._eventStream.post(new CancelBuildTriggered(this._currentBuildCorrelationId));
                this._buildExecutor.cancelBuild();
                this._eventStream.post(new CancelBuildSucceeded(this._currentBuildCorrelationId));
            } catch (err) {
                this._eventStream.post(new CancelBuildFailed(this._currentBuildCorrelationId, err));
            }
        }
    }

    private setAvailableFlag() {
        if (!this._instanceAvailable) {
            throw new DocsError('Last build has not finished.', ErrorCode.TriggerBuildWhenInstantNotAvailable);
        }
        this._instanceAvailable = false;
        this._eventStream.post(new BuildInstantAllocated());
    }

    private resetAvailableFlag() {
        this._instanceAvailable = true;
        this._eventStream.post(new BuildInstantReleased());
    }

    private async getBuildInput(uri: vscode.Uri, credential: Credential): Promise<BuildInput> {
        if (uri) {
            // Trigger build from the right click the workspace file.
            this._activeWorkSpaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        } else if (!this._activeWorkSpaceFolder) {
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
                this._activeWorkSpaceFolder = workspaceFolders[0];
            }
        }

        // Check the workspace is a valid Docs repository
        await this.validateWorkSpaceFolder(this._activeWorkSpaceFolder);
        let localRepositoryPath = this._activeWorkSpaceFolder.uri.fsPath;

        // Check user sign in status
        if (credential.signInStatus !== 'SignedIn') {
            throw new DocsError('You have to sign in first', ErrorCode.TriggerBuildBeforeSignedIn);
        }

        try {
            let [localRepositoryUrl, originalRepositoryUrl] = await this.retrieveRepositoryInfo(localRepositoryPath, credential.userInfo.userToken);
            let outputFolderPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER || getRandomOutputFolder());
            return <BuildInput>{
                buildType: BuildType.FullBuild,
                localRepositoryPath,
                localRepositoryUrl,
                originalRepositoryUrl,
                outputFolderPath,
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
        if (opConfig.docs_build_engine && opConfig.docs_build_engine.name == 'docfx_v2') {
            throw new DocsError(
                'Docs Validation Extension requires the repository has DocFX v3 enabled',
                ErrorCode.TriggerBuildOnV2Repo,
                undefined
            );
        }

        return true;
    }

    private async retrieveRepositoryInfo(localRepositoryPath: string, buildUserToken: string): Promise<string[]> {
        this._eventStream.post(new BuildProgress('Retrieving repository information for current workspace folder...\n'));

        let localRepositoryUrl: string;
        try {
            [, localRepositoryUrl] = await getRepositoryInfoFromLocalFolder(localRepositoryPath);
        } catch (err) {
            throw new Error(`Cannot get the repository information for current workspace folder(${err.message})`);
        }

        let originalRepositoryUrl = await this._opBuildAPIClient.getOriginalRepositoryUrl(localRepositoryUrl, buildUserToken, this._eventStream);

        this._eventStream.post(new RepositoryInfoRetrieved(localRepositoryUrl, originalRepositoryUrl));
        return [localRepositoryUrl, originalRepositoryUrl];
    }
}