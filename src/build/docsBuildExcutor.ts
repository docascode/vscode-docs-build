import * as vscode from 'vscode';
import * as path from 'path';
import { openUrl } from '../common/utility';
import { executeCommandSync, executeCommand } from '../common/cpUtils';
import { docsChannel } from '../common/docsChannel';
import { DocsetInfo } from '../common/shared';
import { buildController } from './buildController';

const DOTNET_INSTALL_PAGE = "https://dotnet.microsoft.com/download/thank-you/dotnet-sdk-2.2.402-windows-x64-installer";
const NODEJS_INSTALL_PAGE = "https://nodejs.org/en/download/";

class DocsBuildExcutor implements vscode.Disposable {
    private docsBuildPath: string;

    constructor() {
        this.docsBuildPath = path.join(__dirname, "..", "..", "resources", "docs.build", "docs-pipeline.dll");
    }

    // TODO: locale
    public RunBuildPipeline(
        repositoryPath: string,
        repositoryUrl: string,
        repositoryBranch: string,
        docsetInfo: DocsetInfo) {
        // TODO: add build progress

        const stdOutHandler = (data: string | Buffer) => {
            docsChannel.appendLine(data.toString());
        }

        // TODO: handle token expire during build
        const stdErrHandler = (data: string | Buffer) => {
            docsChannel.appendLine(data.toString());
        }

        const exitHandler = (code: number) => {
            if (code !== 0) {
                docsChannel.appendLine(`Running command "${command}" failed with exit code "${code}".`);
            } else {
                buildController.visualizeBuildReport();
            }

            buildController.resetAvaibleFlag();
        }

        let command = `set DOCS_REPOSITORY_URL = "${repositoryUrl}"`
            + `& set DOCS_REPOSITORY_BRANCH = "${repositoryBranch}"`
            + `& set DOCS_BASE_PATH = "${docsetInfo.BasePath}"`
            + `& set DOCS_SITE_NAME = "${docsetInfo.SiteName}"`
            + `& set DOCS_PRODUCT_NAME = "${docsetInfo.ProductName}"`
            + `& dotnet "${this.docsBuildPath}" "${repositoryPath}"`
        executeCommand(command, stdOutHandler, stdErrHandler, exitHandler);
    }

    public async checkEnvironment(): Promise<boolean> {
        try {
            docsChannel.appendLine(`  - Checking Dotnet version...`);
            var installedDotnetVersion = await executeCommandSync('dotnet', ['--list-sdks']);
            if (installedDotnetVersion.toString().indexOf('2.2.') > -1) {
                docsChannel.appendLine(`    dotnet 2.2.0 installed: ✔`);
            } else {
                throw new Error();
            }
        } catch (error) {
            docsChannel.appendLine(`    dotnet 2.2.0 installed: ✘`);
            const input = await vscode.window.showErrorMessage(
                "[Docs] Docs Build extension requires dotnet(2.2.0) installed in environment path",
                {
                    "title": "Install dotnet(2.2.0)"
                },
            );
            if (input) {
                openUrl(DOTNET_INSTALL_PAGE);
            }
            return false;
        }

        try {
            docsChannel.appendLine(`  - Checking NodeJs version...`);
            var installedNodeVersion = await executeCommandSync('node', ['--version']);
            docsChannel.appendLine(`    NodeJs installed: ${installedNodeVersion.toString().trim()} ✔`);
        } catch (error) {
            docsChannel.appendLine(`    NodeJs installed: ✘`);
            const input = await vscode.window.showErrorMessage(
                "[Docs] Docs Build extension needs NodeJs installed in environment path",
                {
                    "title": "Install NodeJs"
                },
            );
            if (input) {
                openUrl(NODEJS_INSTALL_PAGE);
            }
            return false;
        }
        return true;
    }

    public dispose(): void {

    }
}

export const docsBuildExcutor = new DocsBuildExcutor();