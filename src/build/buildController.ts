import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Credential } from '../credential/credentialController';
import { OPBuildAPIClient } from './opBuildAPIClient';
import { TriggerErrorType } from './triggerErrorType';
import { EventStream } from '../common/eventStream';
import { DiagnosticController } from './diagnosticController';
import { safelyReadJsonFile, getRepositoryInfoFromLocalFolder } from '../utils/utils';
import { EnvironmentController } from '../common/environmentController';
import { BuildExecutor } from './buildExecutor';
import { PlatformInformation } from '../common/platformInformation';
import { OUTPUT_FOLDER_NAME, OP_CONFIG_FILE_NAME } from '../shared';
import { visualizeBuildReport } from './reportGenerator';
import { BuildJobSucceeded, BuildTriggerFailed, BuildInstantAllocated, BuildInstantReleased, BuildProgress, RepositoryInfoRetrieved, BuildJobTriggered, BuildJobFailed } from '../common/loggingEvents';
import { ExtensionContext } from '../extensionContext';

export class BuildController {
    private activeWorkSpaceFolder: vscode.WorkspaceFolder;
    private instantAvailable: boolean;
    private repositoryUrl: string;
    private opBuildAPIClient: OPBuildAPIClient;
    private buildExecutor: BuildExecutor;

    constructor(
        context: ExtensionContext,
        environmentController: EnvironmentController,
        platformInformation: PlatformInformation,
        private diagnosticController: DiagnosticController,
        private eventStream: EventStream,
    ) {
        this.instantAvailable = true;

        this.opBuildAPIClient = new OPBuildAPIClient(environmentController);
        this.buildExecutor = new BuildExecutor(context, platformInformation, environmentController, eventStream);
    }

    public async build(uri: vscode.Uri, credential: Credential): Promise<void> {
        if (!this.trySetAvailableFlag()) {
            return;
        }

        try {
            if (!(await this.initializeWorkspaceFolderInfo(uri, credential))) {
                return;
            }

            this.eventStream.post(new BuildJobTriggered(this.activeWorkSpaceFolder.name));
            let buildSucceeded = await this.buildExecutor.RunBuild(
                this.repositoryPath,
                this.repositoryUrl,
                path.join(this.repositoryPath, OUTPUT_FOLDER_NAME),
                credential.userInfo.userToken
            );
            // TODO: For multiple docset repo, we still need to generate report if one docset build crashed
            if (buildSucceeded
                && visualizeBuildReport(this.repositoryPath, this.diagnosticController, this.eventStream)) {
                this.eventStream.post(new BuildJobSucceeded());
            } else {
                this.eventStream.post(new BuildJobFailed());
            }
        }
        finally {
            this.resetAvailableFlag();
        }
    }

    private trySetAvailableFlag(): boolean {
        if (!this.instantAvailable) {
            this.eventStream.post(new BuildTriggerFailed('Last build has not finished.', TriggerErrorType.TriggerBuildWhenInstantNotAvailable));
            return false;
        }
        this.instantAvailable = false;
        this.eventStream.post(new BuildInstantAllocated());
        return true;
    }

    private get repositoryPath(): string {
        if (this.activeWorkSpaceFolder) {
            return this.activeWorkSpaceFolder.uri.fsPath;
        }
        return undefined;
    }

    private resetAvailableFlag() {
        this.instantAvailable = true;
        this.eventStream.post(new BuildInstantReleased());
    }

    private async initializeWorkspaceFolderInfo(uri: vscode.Uri, credential: Credential): Promise<boolean> {
        if (uri) {
            // Trigger build from the right click the workspace file.
            this.activeWorkSpaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        } else if (!this.activeWorkSpaceFolder) {
            // Trigger build from command palette or click the status bar
            let workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                if (workspaceFolders.length > 1) {
                    // TODO: Display a command palette to let user select the target workspace folder.
                    this.eventStream.post(new BuildTriggerFailed(
                        'Multiple workspace folders are opened. Please right click any file inside the target workspace folder to trigger the build',
                        TriggerErrorType.TriggerBuildWithoutSpecificWorkspace));
                    return false;
                }
                this.activeWorkSpaceFolder = workspaceFolders[0];
            }
        }

        // Check the workspace is a valid Docs repository
        if (!(await this.validateWorkSpaceFolder(this.activeWorkSpaceFolder))) {
            return false;
        }

        // Check user sign in status
        if (credential.signInStatus !== 'SignedIn') {
            this.eventStream.post(new BuildTriggerFailed('You have to sign-in firstly', TriggerErrorType.TriggerBuildBeforeSignedIn));
            return false;
        }

        try {
            this.repositoryUrl = await this.retrieveRepositoryInfo(credential.userInfo.userToken);
        } catch (err) {
            this.eventStream.post(new BuildTriggerFailed(
                err.message,
                TriggerErrorType.TriggerBuildOnInvalidDocsRepo
            ));
            return false;
        }

        return true;
    }

    private async validateWorkSpaceFolder(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
        if (!workspaceFolder) {
            this.eventStream.post(new BuildTriggerFailed('You can only trigger the build on a workspace folder.', TriggerErrorType.TriggerBuildOnNonWorkspace));
            return false;
        }

        let opConfigPath = path.join(workspaceFolder.uri.fsPath, OP_CONFIG_FILE_NAME);
        if (!fs.existsSync(opConfigPath)) {
            this.eventStream.post(new BuildTriggerFailed(
                `Cannot find '${OP_CONFIG_FILE_NAME}' file under current workspace folder.`,
                TriggerErrorType.TriggerBuildOnNonDocsRepo
            ));
            return false;
        }

        let opConfig = safelyReadJsonFile(opConfigPath);
        if (!opConfig.docs_build_engine || opConfig.docs_build_engine.name !== 'docfx_v3') {
            this.eventStream.post(new BuildTriggerFailed(
                'Docs Build requires the repository enable DocFX v3',
                TriggerErrorType.TriggerBuildOnV2Repo,
                [opConfigPath]
            ));

            return false;
        }

        return true;
    }

    private async retrieveRepositoryInfo(buildUserToken: string): Promise<string> {
        this.eventStream.post(new BuildProgress('Retrieving repository information for the current workspace folder...'));

        let localRepositoryUrl: string;
        try {
            [localRepositoryUrl] = await getRepositoryInfoFromLocalFolder(this.repositoryPath);
        } catch (err) {
            throw new Error(`Cannot get the repository information for the current workspace folder(${err.message})`);
        }

        let originalRepositoryUrl = await this.opBuildAPIClient.getOriginalRepositoryUrl(localRepositoryUrl, buildUserToken, this.eventStream);

        this.eventStream.post(new RepositoryInfoRetrieved(localRepositoryUrl, originalRepositoryUrl));
        return originalRepositoryUrl;
    }
}