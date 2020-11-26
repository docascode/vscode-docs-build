import vscode from 'vscode';
import fs from 'fs-extra';
import path from 'path';
import { Credential } from '../credential/credentialController';
import { OPBuildAPIClient } from './opBuildAPIClient';
import { EventStream } from '../common/eventStream';
import { DiagnosticController } from './diagnosticController';
import { safelyReadJsonFile, getRepositoryInfoFromLocalFolder, getDurationInSeconds, normalizeDriveLetter, getTempOutputFolder } from '../utils/utils';
import { BuildExecutor } from './buildExecutor';
import { OP_CONFIG_FILE_NAME, UserType } from '../shared';
import { visualizeBuildReport } from './reportGenerator';
import { BuildInstantAllocated, BuildInstantReleased, BuildProgress, RepositoryInfoRetrieved, BuildTriggered, BuildFailed, BuildStarted, BuildSucceeded, BuildCanceled, CancelBuildTriggered, CancelBuildSucceeded, CancelBuildFailed, CredentialExpired } from '../common/loggingEvents';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { BuildInput, BuildType } from './buildInput';
import { DocfxExecutionResult } from './buildResult';
import { EnvironmentController } from '../common/environmentController';

export class BuildController {
    private _currentBuildCorrelationId: string;
    private _instanceAvailable: boolean;
    private _buildInput: BuildInput;

    constructor(
        private _buildExecutor: BuildExecutor,
        private _opBuildAPIClient: OPBuildAPIClient,
        private _diagnosticController: DiagnosticController,
        private _environmentController: EnvironmentController,
        private _eventStream: EventStream,
    ) {
        this._instanceAvailable = true;
    }

    public get instanceAvailable(): boolean {
        return this._instanceAvailable;
    }

    public async build(correlationId: string, credential: Credential): Promise<void> {
        let buildInput: BuildInput;
        this._eventStream.post(new BuildTriggered(correlationId, !!credential.userInfo));
        let start = Date.now();

        try {
            await this.validateUserCredential(credential);
            buildInput = await this.getBuildInput(credential);
            fs.emptyDirSync(this._buildInput.outputFolderPath);
            fs.removeSync(this._buildInput.logPath);
            this.setAvailableFlag();
        } catch (err) {
            this._eventStream.post(new BuildFailed(correlationId, buildInput, getTotalTimeInSeconds(), err));
            return;
        }

        try {
            this._currentBuildCorrelationId = correlationId;
            this._eventStream.post(new BuildStarted(buildInput.workspaceFolderName));
            let buildResult = await this._buildExecutor.RunBuild(correlationId, buildInput, credential.userInfo?.userToken);
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
            if (!this._environmentController.debugMode) {
                fs.remove(buildInput.outputFolderPath);
                fs.removeSync(this._buildInput.logPath);
            }
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
        if (this._environmentController.userType === UserType.PublicContributor) {
            return;
        }
        if (credential.signInStatus !== 'SignedIn' && this._environmentController.userType === UserType.MicrosoftInternalEmployee) {
            throw new DocsError(`It is required for Microsoft internal employees to sign in before validation, please sign in first.`, ErrorCode.TriggerBuildBeforeSignIn);
        }

        if (!(await this._opBuildAPIClient.validateCredential(credential.userInfo.userToken, this._eventStream))) {
            this._eventStream.post(new CredentialExpired());
            throw new DocsError(`Credential has expired. Please sign in again to continue.`, ErrorCode.TriggerBuildWithCredentialExpired);
        }
    }

    private async getBuildInput(credential: Credential): Promise<BuildInput> {
        if (this._buildInput) {
            return this._buildInput;
        }

        // Check the workspace is a valid Docs repository
        let activeWorkSpaceFolder = await this.getValidatedWorkSpace();
        let localRepositoryPath = activeWorkSpaceFolder.uri.fsPath;

        try {
            let [localRepositoryUrl, originalRepositoryUrl] = await this.retrieveRepositoryInfo(localRepositoryPath, credential.userInfo?.userToken);
            let dryRun = this.needDryRun(activeWorkSpaceFolder.uri.fsPath);
            let outputFolderPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER || getTempOutputFolder());
            let logPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_LOG_PATH || path.join(outputFolderPath, '.errors.log'));
            this._buildInput = <BuildInput>{
                workspaceFolderName: activeWorkSpaceFolder.name,
                buildType: BuildType.FullBuild,
                localRepositoryPath,
                localRepositoryUrl,
                originalRepositoryUrl,
                outputFolderPath,
                logPath,
                dryRun,
            };
            return this._buildInput;
        } catch (err) {
            throw new DocsError(
                err.message,
                ErrorCode.TriggerBuildOnInvalidDocsRepo
            );
        }
    }

    private async getValidatedWorkSpace(): Promise<vscode.WorkspaceFolder> {
        let workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new DocsError(
                'You can only trigger the build on a workspace folder.',
                ErrorCode.TriggerBuildOnNonWorkspace
            );
        }

        if (workspaceFolders.length > 1) {
            throw new DocsError(
                'Validation is triggered on a workspace which contains multiple folders, please close other folders and only keep one in the current workspace',
                ErrorCode.TriggerBuildOnWorkspaceWithMultipleFolders
            );
        }

        let workspaceFolder = workspaceFolders[0];

        let opConfigPath = path.join(workspaceFolder.uri.fsPath, OP_CONFIG_FILE_NAME);
        if (!fs.existsSync(opConfigPath)) {
            throw new DocsError(
                `Cannot find '${OP_CONFIG_FILE_NAME}' file under current workspace folder, please open the root directory of the repository and retry`,
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

        return workspaceFolder;
    }

    private needDryRun(repoPath: string): boolean {
        // TODO: Remove this when the learn validation is implemented in the validation service.
        // Related feature link: https://dev.azure.com/ceapex/Engineering/_workitems/edit/265252
        let opConfigPath = path.join(repoPath, OP_CONFIG_FILE_NAME);
        let opConfig = safelyReadJsonFile(opConfigPath);

        return !opConfig.docsets_to_publish.some((docset: any) => {
            return docset.customized_tasks
                && docset.customized_tasks.docset_postbuild
                && docset.customized_tasks.docset_postbuild.some(
                    (script: string) => script.toLocaleLowerCase().endsWith("triplecrownvalidation.ps1")
                );
        });
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

        this._eventStream.post(new BuildProgress('Trying to get provisioned repository information...'));
        let docsetName = this.getOneDocsetNameFromOpConfig(localRepositoryPath);
        if (!docsetName) {
            throw new Error(`No docset found in the repository configuration`);
        }
        let originalRepositoryUrl = await this._opBuildAPIClient.getProvisionedRepositoryUrlByDocsetNameAndLocale(docsetName, locale, buildUserToken, this._eventStream);

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