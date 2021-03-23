import fs from 'fs-extra';
// eslint-disable-next-line node/no-unpublished-import
import getPort from 'get-port';
import path from 'path';
import vscode, { Disposable } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { BuildCanceled, BuildFailed, BuildInstantAllocated, BuildInstantReleased, BuildProgress, BuildStarted, BuildSucceeded, BuildTriggered, CancelBuildFailed, CancelBuildSucceeded, CancelBuildTriggered, CredentialExpired, RepositoryInfoRetrieved, StartLanguageServerCompleted } from '../common/loggingEvents';
import { CredentialController } from '../credential/credentialController';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { OP_CONFIG_FILE_NAME, UserType } from '../shared';
import { getDurationInSeconds, getRepositoryInfoFromLocalFolder, getTempOutputFolder,normalizeDriveLetter, safelyReadJsonFile } from '../utils/utils';
import { BuildExecutor } from './buildExecutor';
import { BuildInput, BuildType } from './buildInput';
import { DocfxExecutionResult } from './buildResult';
import { DiagnosticController } from './diagnosticController';
import { OPBuildAPIClient } from './opBuildAPIClient';
import { visualizeBuildReport } from './reportGenerator';

export class BuildController implements Disposable {
    private _currentBuildCorrelationId: string;
    private _instanceAvailable: boolean;
    private _buildInput: BuildInput;
    private _client: LanguageClient;
    private _disposable: Disposable;

    constructor(
        private _buildExecutor: BuildExecutor,
        private _opBuildAPIClient: OPBuildAPIClient,
        private _diagnosticController: DiagnosticController,
        private _environmentController: EnvironmentController,
        private _eventStream: EventStream,
        private _credentialController: CredentialController
    ) {
        this._instanceAvailable = true;
    }

    dispose(): void {
        if (this._disposable) {
            this._disposable.dispose();
        }
        if (this._client) {
            this._client.stop();
        }
    }

    public get instanceAvailable(): boolean {
        return this._instanceAvailable;
    }

    public async build(correlationId: string): Promise<void> {
        let buildInput: BuildInput;
        this._eventStream.post(new BuildTriggered(correlationId, !!this._credentialController.credential.userInfo));
        const start = Date.now();

        try {
            await this.validateUserCredential();
            buildInput = await this.getBuildInput();
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
            const buildResult = await this._buildExecutor.RunBuild(correlationId, buildInput, this._credentialController.credential.userInfo?.userToken);
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

    public async startDocfxLanguageServer(): Promise<void> {
        let buildInput: BuildInput;

        try {
            await this.validateUserCredential();
            buildInput = await this.getBuildInput(true);
            this._client = await this._buildExecutor.getLanguageClient(buildInput, this._credentialController.credential.userInfo?.userToken);
            this._disposable = this._client.start();

            // share the diagnostics collection to full-repo validation.
            this._diagnosticController.setDiagnosticCollection(this._client.diagnostics);
            this._eventStream.post(new StartLanguageServerCompleted(true));
        } catch (err) {
            this._eventStream.post(new StartLanguageServerCompleted(false, err));
            return;
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

    private async validateUserCredential() {
        if (this._environmentController.userType === UserType.PublicContributor) {
            return;
        }
        if (this._credentialController.credential.signInStatus !== 'SignedIn' && this._environmentController.userType === UserType.MicrosoftEmployee) {
            throw new DocsError(`Microsoft employees must sign in before validating.`, ErrorCode.TriggerBuildBeforeSignIn);
        }

        if (!(await this._opBuildAPIClient.validateCredential(this._credentialController.credential.userInfo.userToken, this._eventStream))) {
            this._eventStream.post(new CredentialExpired());
            throw new DocsError(`Credential has expired. Please sign in again to continue.`, ErrorCode.TriggerBuildWithCredentialExpired);
        }
    }

    private async getBuildInput(getAvailablePort = false): Promise<BuildInput> {
        if (this._buildInput) {
            return this._buildInput;
        }

        // Check the workspace is a valid Docs repository
        const activeWorkSpaceFolder = await this.getValidatedWorkSpace();
        const localRepositoryPath = activeWorkSpaceFolder.uri.fsPath;

        try {
            const [localRepositoryUrl, originalRepositoryUrl] = await this.retrieveRepositoryInfo(localRepositoryPath, this._credentialController.credential.userInfo?.userToken);
            const dryRun = this.needDryRun(activeWorkSpaceFolder.uri.fsPath);
            const outputFolderPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER || getTempOutputFolder());
            const logPath = normalizeDriveLetter(process.env.VSCODE_DOCS_BUILD_EXTENSION_LOG_PATH || path.join(outputFolderPath, '.errors.log'));
            const port = getAvailablePort ? await getPort() : undefined;
            this._buildInput = <BuildInput>{
                workspaceFolderName: activeWorkSpaceFolder.name,
                buildType: BuildType.FullBuild,
                localRepositoryPath,
                localRepositoryUrl,
                originalRepositoryUrl,
                outputFolderPath,
                logPath,
                dryRun,
                port
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
        const workspaceFolders = vscode.workspace.workspaceFolders;

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

        const workspaceFolder = workspaceFolders[0];

        const opConfigPath = path.join(workspaceFolder.uri.fsPath, OP_CONFIG_FILE_NAME);
        if (!fs.existsSync(opConfigPath)) {
            throw new DocsError(
                `Cannot find '${OP_CONFIG_FILE_NAME}' file under current workspace folder, please open the root directory of the repository and retry`,
                ErrorCode.TriggerBuildOnNonDocsRepo
            );
        }

        const opConfig = safelyReadJsonFile(opConfigPath);
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
        const opConfigPath = path.join(repoPath, OP_CONFIG_FILE_NAME);
        const opConfig = safelyReadJsonFile(opConfigPath);

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
        const docsetName = this.getOneDocsetNameFromOpConfig(localRepositoryPath);
        if (!docsetName) {
            throw new Error(`No docset found in the repository configuration`);
        }
        const originalRepositoryUrl = await this._opBuildAPIClient.getProvisionedRepositoryUrlByDocsetNameAndLocale(docsetName, locale, buildUserToken, this._eventStream);

        this._eventStream.post(new RepositoryInfoRetrieved(localRepositoryUrl, originalRepositoryUrl));
        return [localRepositoryUrl, originalRepositoryUrl];
    }

    private getOneDocsetNameFromOpConfig(localRepositoryPath: string) {
        const opConfigPath = path.join(localRepositoryPath, OP_CONFIG_FILE_NAME);

        const opConfig = safelyReadJsonFile(opConfigPath);
        if (opConfig.docsets_to_publish && opConfig.docsets_to_publish.length > 0) {
            return opConfig.docsets_to_publish[0].docset_name;
        }
        return undefined;
    }
}