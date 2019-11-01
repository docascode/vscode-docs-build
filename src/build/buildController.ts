import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { docsChannel } from '../common/docsChannel';
import { diagnosticController } from '../diagnostics/diagnosticsController';
import { safelyReadJsonFile, getRepositoryInfoFromLocalFolder } from '../common/utility';
import { DocsetInfo, BuildEnv, BuildStatus } from '../common/shared';
import { OpBuildAPIClient } from '../common/opBuildAPIClient';
import { credentialController } from '../credential/credentialController';
import { docsBuildExcutor } from './docsBuildExcutor';

const OUTPUT_FOLDER_NAME = '_site';
const REPORT_FILENAME = '.errors.log';

type MessageSeverity = "error" | "warning" | "info" | "suggestion";
type LogItemType = 'system' | ' user';

const SeverityMap = new Map<MessageSeverity, vscode.DiagnosticSeverity>([
    ["error", vscode.DiagnosticSeverity.Error],
    ["warning", vscode.DiagnosticSeverity.Warning],
    ["info", vscode.DiagnosticSeverity.Hint],
    ["suggestion", vscode.DiagnosticSeverity.Information]
]);

interface ReportItem {
    message_severity: MessageSeverity,
    log_item_type: LogItemType,
    code: string,
    message: string,
    file: string,
    line: number,
    end_line: number,
    column: number,
    end_column: number,
    date_time: Date
}

class BuildController implements vscode.Disposable {
    // TODO: support building on save

    private activeWorkSpaceFolder: vscode.WorkspaceFolder | undefined;
    private repositoryUrl: string | undefined;
    private repositoryBranch: string | undefined;
    private docsetInfo: DocsetInfo | undefined;
    private buildEnv: BuildEnv;
    private opBuildAPIClient: OpBuildAPIClient;
    private BuildStatus: BuildStatus = 'Ready';
    private didChange: vscode.EventEmitter<BuildStatus>;

    public onStatusChanged: vscode.Event<BuildStatus>;

    constructor() {
        this.buildEnv = 'ppe';
        this.didChange = new vscode.EventEmitter<BuildStatus>();
        this.onStatusChanged = this.didChange.event;
    }

    public getBuildStatus() {
        return this.BuildStatus;
    }

    public async build(uri: vscode.Uri): Promise<void> {
        try {
            if (!this.trySetAvaibleFlag()) {
                // TODO: support cancle the current build
                vscode.window.showWarningMessage(`[Docs Build] Last build has not finished.`);
                return;
            }

            docsChannel.show();
            docsChannel.appendLine('\n\n---------------------------');

            docsChannel.appendLine(`Preparing build context...`);
            if (!(await this.initializeWorkspaceFolderInfo(uri))) {
                this.resetAvaibleFlag();
                return;
            }

            docsChannel.appendLine(`Start to build workspace folder '${this.activeWorkSpaceFolder!.name}'`);
            docsBuildExcutor.RunBuildPipeline(this.activeWorkSpaceFolder!.uri.fsPath, this.repositoryUrl!, this.repositoryBranch!, this.docsetInfo!);
        } catch (err) {
            docsChannel.appendLine(`Build abort since some error happened: ${err.message}`);

            if (err.action) {
                let input = await vscode.window.showErrorMessage(`[Docs Build] Error happened when building the current workspace folder: \n${err.message}`, err.action);
                if (input) {
                    vscode.commands.executeCommand(input!.command)
                }
            } else {
                vscode.window.showErrorMessage(`[Docs Build] Error happened when building the current workspace folder: \n${err.message}`);

            }

            this.resetAvaibleFlag();
        }
    }

    public trySetAvaibleFlag(): boolean {
        if (this.BuildStatus === 'Building') {
            return false;
        }
        this.BuildStatus = 'Building';
        this.didChange.fire(this.BuildStatus);
        return true;
    }

    public resetAvaibleFlag() {
        this.BuildStatus = 'Ready';
        this.didChange.fire(this.BuildStatus);
    }

    public visualizeBuildReport() {
        try {
            var reportFilePath = path.join(this.activeWorkSpaceFolder!.uri.fsPath, OUTPUT_FOLDER_NAME, REPORT_FILENAME);
            if (!fs.existsSync(reportFilePath)) {
                vscode.window.showErrorMessage(`[Docs Build] Cannot find the report file(.error.log)`);
            }

            var report = fs.readFileSync(reportFilePath).toString().split('\n').filter(item => item);
            var diagnosticsSet = new Map<string, any>();
            report.forEach(item => {
                var reportItem = <ReportItem>JSON.parse(item);

                if (!reportItem.file) {
                    // TODO: handle the diagnostics without source info
                    console.log(`Diagnostics without source info: ${item}`);
                    return;
                }
                let range = new vscode.Range(reportItem.line - 1, reportItem.column - 1, reportItem.end_line - 1, reportItem.end_column - 1);
                let diagnostic = new vscode.Diagnostic(range, reportItem.message, SeverityMap.get(reportItem.message_severity));
                diagnostic.code = reportItem.code;

                if (!diagnosticsSet.has(reportItem.file)) {
                    diagnosticsSet.set(reportItem.file, {
                        uri: vscode.Uri.file(path.resolve(this.activeWorkSpaceFolder!.uri.fsPath, reportItem.file)),
                        diagnostics: []
                    })
                }
                diagnosticsSet.get(reportItem.file).diagnostics.push(diagnostic)
            })

            diagnosticsSet.forEach((value) => {
                diagnosticController.setDiagnostic(value.uri, value.diagnostics);
            });
        } catch (err) {
            docsChannel.appendLine(`Error happened when visualizing the build report: ${err}`);
        }
    }

    private async initializeOpBuildAPIClient(): Promise<boolean> {
        if (credentialController.account.status !== 'SignedIn') {
            docsChannel.appendLine(`Build abort since you haven't signed in to Docs, please Sign in and try again.`);

            let input = await vscode.window.showErrorMessage(
                `[Docs Build] Please Sign in to Docs portal first`,
                { title: 'Sign In', command: 'docs.signIn' }
            );
            if (input) {
                vscode.commands.executeCommand(input!.command);
            }
            return false;
        }

        // TODO: get build env
        this.opBuildAPIClient = new OpBuildAPIClient('ppe');
        return true;
    }

    private async initializeWorkspaceFolderInfo(uri: vscode.Uri): Promise<boolean> {
        let workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!(await this.validateWorkSpaceFolder(workspaceFolder))) {
            return false;
        }

        if (this.activeWorkSpaceFolder && this.activeWorkSpaceFolder.uri === workspaceFolder!.uri) {
            return true;
        }

        if (!this.opBuildAPIClient) {
            if (!(await this.initializeOpBuildAPIClient())) {
                return false;
            }
        }

        // TODO: user may switch branch, the opconfig(locale) may also change according to that
        docsChannel.appendLine(`\nGetting repository information for the current workspace folder...`);
        [this.repositoryUrl, this.repositoryBranch] = await getRepositoryInfoFromLocalFolder(workspaceFolder!.uri.fsPath);
        docsChannel.appendLine(`  Repository URL: ${this.repositoryUrl};`);
        docsChannel.appendLine(`  Repository Branch: ${this.repositoryBranch};`);

        docsChannel.appendLine(`\nGetting docset information for this repository...`);

        this.docsetInfo = await this.opBuildAPIClient.getDocsetInfo(this.repositoryUrl)

        docsChannel.appendLine(`  Docset Site Base Path: ${this.docsetInfo.BasePath};`);
        docsChannel.appendLine(`  Docset Site Name: ${this.docsetInfo.SiteName};`);
        docsChannel.appendLine(`  Docset Product Name: ${this.docsetInfo.ProductName};`);

        this.activeWorkSpaceFolder = workspaceFolder;
        return true;
    }

    private async validateWorkSpaceFolder(workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<boolean> {
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('[Docs Build] You can only trigger the build on a workspace folder.')
            return false;
        }

        let opConfigPath = path.join(workspaceFolder.uri.fsPath, '.openpublishing.publish.config.json');
        if (!fs.existsSync(opConfigPath)) {
            // TODO: add more instruction
            vscode.window.showErrorMessage('[Docs Build] Cannot find `.openpublishing.publish.config.json` file under current workspace folder.')
            return false;
        }

        let opConfig = safelyReadJsonFile(opConfigPath);
        if (!opConfig.docs_build_engine || opConfig.docs_build_engine.name !== 'docfx_v3') {
            let input = await vscode.window.showErrorMessage(
                `[Docs] Docs Build extension requires the repository migrated to docfx v3`,
                { title: 'Migrate to docfx v3' }
            );
            if (input) {
                opConfig.docs_build_engine = { name: 'docfx_v3' };
                vscode.window.showTextDocument(vscode.Uri.file(opConfigPath));
                fs.writeJSONSync(opConfigPath, opConfig, { spaces: 2 });
                docsChannel.appendLine(`This repository has been migrated to docfx v3, build continue..`);
                return true;
            }
            docsChannel.appendLine(`Build abort since this repository has been migrated to docfx v3`);
            return false;
        }

        return true;
    }

    public dispose(): void {

    }
}

export const buildController = new BuildController();