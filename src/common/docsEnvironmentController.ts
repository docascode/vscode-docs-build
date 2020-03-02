import vscode from 'vscode';
import { Environment, DocsRepoType, EXTENSION_NAME } from '../shared';
import { EnvironmentChanged } from './loggingEvents';
import { EventStream } from './eventStream';
import { EnvironmentController } from './environmentController';
import { getRepositoryInfoFromLocalFolder } from '../utils/utils';

const ENVIRONMENT_CONFIG_NAME = 'environment';

export class DocsEnvironmentController implements EnvironmentController, vscode.Disposable {

    private activeWorkSpaceFolder: vscode.WorkspaceFolder;
    private environment: Environment;
    private _docsRepoType: DocsRepoType;
    private configurationChangeListener: vscode.Disposable;

    constructor(private eventStream: EventStream) {
        this.activeWorkSpaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
    }

    public static async CreateAsync(eventStream: EventStream): Promise<DocsEnvironmentController> {
        const docsEnvironmentController = new DocsEnvironmentController(eventStream);
        await docsEnvironmentController.refreshEnv();
        docsEnvironmentController.configurationChangeListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${EXTENSION_NAME}.${ENVIRONMENT_CONFIG_NAME}`)) {
                docsEnvironmentController.refreshEnv();
            }
        });
        return docsEnvironmentController;
    }

    public dispose(): void {
        this.configurationChangeListener.dispose();
    }

    public get env(): Environment {
        return this.environment;
    }

    public get docsRepoType(): DocsRepoType {
        return this._docsRepoType;
    }

    private getEnv(): Environment {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<Environment>(ENVIRONMENT_CONFIG_NAME, 'PROD');
    }

    private async getDocsRepoType(): Promise<DocsRepoType> {
        if (this.activeWorkSpaceFolder) {
            try {
                const [docsRepoType] = await getRepositoryInfoFromLocalFolder(this.activeWorkSpaceFolder.uri.fsPath);
                return docsRepoType;
            } catch {
                return 'GitHub';
            }
        }
        return 'GitHub';
    }

    private async refreshEnv(): Promise<void> {
        let newEnv = this.getEnv();
        let newDocsRepoType = await this.getDocsRepoType();

        if((this.environment && this.environment !== newEnv) ||
           (this._docsRepoType && this._docsRepoType !== newDocsRepoType)) {
            this.eventStream.post(new EnvironmentChanged(newEnv));
        }
        this.environment = newEnv;
        this._docsRepoType = newDocsRepoType;
    }
}