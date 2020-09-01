import vscode from 'vscode';
import fs from 'fs-extra';
import path from 'path';
import { Credential } from '../credential/credentialController';
import { OPBuildAPIClient } from './opBuildAPIClient';
import { EventStream } from '../common/eventStream';
import { DiagnosticController } from './diagnosticController';
import { safelyReadJsonFile, getRepositoryInfoFromLocalFolder, getDurationInSeconds, normalizeDriveLetter, getTempOutputFolder } from '../utils/utils';
import { BuildExecutor } from './buildExecutor';
import { OP_CONFIG_FILE_NAME } from '../shared';
import { visualizeBuildReport } from './reportGenerator';
import { BuildInstantAllocated, BuildInstantReleased, BuildProgress, RepositoryInfoRetrieved, BuildTriggered, BuildFailed, BuildStarted, BuildSucceeded, BuildCanceled, CancelBuildTriggered, CancelBuildSucceeded, CancelBuildFailed, CredentialExpired } from '../common/loggingEvents';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { BuildInput, BuildType } from './buildInput';
import { DocfxExecutionResult } from './buildResult';

export class BuildController {
    private _activeWorkSpaceFolder: vscode.WorkspaceFolder;
    private _currentBuildCorrelationId: string;
    private _instanceAvailable: boolean;
    private _buildInput: BuildInput;

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
            await this.validateUserCredential(credential);
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
                    visualizeBuildReport(buildInput.localRepositoryPath, buildInput.logPath, this._diagnosticController, this._eventStream);
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
            fs.remove(buildInput.outputFolderPath);
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

    private async validateUserCredential(credential: Credential) {
        if (credential.signInStatus !== 'SignedIn') {
            throw new DocsError(`You have to sign in first`, ErrorCode.TriggerBuildBeforeSignedIn);
        }

        if (!(await this._opBuildAPIClient.validateCredential(credential.userInfo.userToken, this._eventStream))) {
            this._eventStream.post(new CredentialExpired());
            throw new DocsError(`Credential has expired. Please sign in again to continue.`, ErrorCode.TriggerBuildWithCredentialExpired);
        }
    }

    private async getBuildInput(uri: vscode.Uri, credential: Credential): Promise<BuildInput> {
        let activeWorkSpaceFolder;
        if (uri) {
            activeWorkSpaceFolder = vscode.workspace.getWorkspaceFolder(uri);
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
                activeWorkSpaceFolder = workspaceFolders[0];
            }
        } else {
            activeWorkSpaceFolder = this._activeWorkSpaceFolder;
        }

        if (activeWorkSpaceFolder !== null && activeWorkSpaceFolder === this._activeWorkSpaceFolder && this._buildInput) {
            return this._buildInput;
        }
        this._activeWorkSpaceFolder = activeWorkSpaceFolder;

        // Check the workspace is a valid Docs repository
        await this.validateWorkSpaceFolder(this._activeWorkSpaceFolder);
        let localRepositoryPath = this._activeWorkSpaceFolder.uri.fsPath;

        try {
            let [localRepositoryUrl, originalRepositoryUrl] = await this.retrieveRepositoryInfo(localRepositoryPath, credential.userInfo.userToken);
            let outputFolderPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER || getTempOutputFolder());
            let logPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_LOG_PATH || path.join(outputFolderPath, '.errors.log'));
            this._buildInput = <BuildInput>{
                buildType: BuildType.FullBuild,
                localRepositoryPath,
                localRepositoryUrl,
                originalRepositoryUrl,
                outputFolderPath,
                logPath,
            };
            return this._buildInput;
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
        if (opConfig.docs_build_engine && opConfig.docs_build_engine.name === 'docfx_v2') {
            throw new DocsError(
                'Docs Validation Extension requires the repository has DocFX v3 enabled',
                ErrorCode.TriggerBuildOnV2Repo,
                undefined
            );
        }

        return true;
    }

    private async retrieveRepositoryInfo(localRepositoryPath: string, buildUserToken: string): Promise<string[]> {
        this._eventStream.post(new BuildProgress('Retrieving repository information for current workspace folder...'));

        let localRepositoryUrl: string;
        let locale: string;
        try {
            [, localRepositoryUrl, , , locale] = await getRepositoryInfoFromLocalFolder(localRepositoryPath);
        } catch (err) {
            throw new Error(`Cannot get the repository information for current workspace folder(${err.message})`);
        }

        this._eventStream.post(new BuildProgress('Trying to get provisioned repository information by repository URL...'));
        let originalRepositoryUrl = await this._opBuildAPIClient.getProvisionedRepositoryUrlByRepositoryUrl(localRepositoryUrl, buildUserToken, this._eventStream);
        if (!originalRepositoryUrl) {
            this._eventStream.post(new BuildProgress('Trying to get provisioned repository information by docset information...'));

            let docsetName = this.getOneDocsetNameFromOpConfig(localRepositoryPath);
            if (!docsetName) {
                throw new Error(`No docset found in the repository configuration`);
            }
            originalRepositoryUrl = await this._opBuildAPIClient.getProvisionedRepositoryUrlByDocsetNameAndLocale(docsetName, locale, buildUserToken, this._eventStream);
        }

        this._eventStream.post(new RepositoryInfoRetrieved(localRepositoryUrl, originalRepositoryUrl));
        return [localRepositoryUrl, originalRepositoryUrl];
    }

    private getOneDocsetNameFromOpConfig(localRepositoryPath: string) {
        let opConfigPath = path.join(localRepositoryPath, OP_CONFIG_FILE_NAME);

        let opConfig = safelyReadJsonFile(opConfigPath);
        if (opConfig.docsets_to_publish && opConfig.docsets_to_publish.length > 0) {
            return opConfig.docsets_to_publish[0].docset_name;
        }
        return undefined;
    }
}