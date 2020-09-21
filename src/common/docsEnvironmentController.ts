import vscode from 'vscode';
import { Environment, DocsRepoType, EXTENSION_NAME, ENVIRONMENT_CONFIG_NAME, DEBUG_MODE_CONFIG_NAME, SIGN_RECOMMEND_HINT_CONFIG_NAME } from '../shared';
import { EnvironmentChanged } from './loggingEvents';
import { EventStream } from './eventStream';
import { EnvironmentController } from './environmentController';
import { getRepositoryInfoFromLocalFolder } from '../utils/utils';

export class DocsEnvironmentController implements EnvironmentController, vscode.Disposable {
    private _environment: Environment;
    private _debugMode: boolean;
    private _docsRepoType: DocsRepoType;
    private _configurationChangeListener: vscode.Disposable;
    private _enableSignRecommendHint: boolean;

    constructor(private _eventStream: EventStream) {
    }

    public async initialize() {
        this._environment = this.getEnv();
        this._debugMode = this.getDebugMode();
        this._enableSignRecommendHint = this.getEnableSignRecommendHint();
        this._docsRepoType = await this.getDocsRepoType();

        this._configurationChangeListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${EXTENSION_NAME}.${ENVIRONMENT_CONFIG_NAME}`)) {
                this.refreshEnv();
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${DEBUG_MODE_CONFIG_NAME}`)) {
                this._debugMode = this.getDebugMode();
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${SIGN_RECOMMEND_HINT_CONFIG_NAME}`)) {
                this._enableSignRecommendHint = this.getEnableSignRecommendHint();
            }
        });
    }

    public static async CreateAsync(eventStream: EventStream): Promise<DocsEnvironmentController> {
        const docsEnvironmentController = new DocsEnvironmentController(eventStream);
        await docsEnvironmentController.initialize();

        return docsEnvironmentController;
    }

    public dispose(): void {
        this._configurationChangeListener.dispose();
    }

    public get env(): Environment {
        return this._environment;
    }

    public get docsRepoType(): DocsRepoType {
        return this._docsRepoType;
    }

    public get debugMode(): boolean {
        return this._debugMode;
    }

    public get enableSignRecommendHint(): boolean {
        return this._enableSignRecommendHint;
    }

    private getEnv(): Environment {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<Environment>(ENVIRONMENT_CONFIG_NAME, 'PROD');
    }

    private getDebugMode(): boolean {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<boolean>(DEBUG_MODE_CONFIG_NAME, false);
    }

    private getEnableSignRecommendHint(): boolean {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<boolean>(SIGN_RECOMMEND_HINT_CONFIG_NAME, true);
    }

    private async getDocsRepoType(): Promise<DocsRepoType> {
        let activeWorkSpaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        if (activeWorkSpaceFolder) {
            try {
                const [docsRepoType] = await getRepositoryInfoFromLocalFolder(activeWorkSpaceFolder.uri.fsPath);
                return docsRepoType;
            } catch {
                return 'GitHub';
            }
        }
        return 'GitHub';
    }

    private refreshEnv() {
        let newEnv = this.getEnv();

        if (this._environment && this._environment !== newEnv) {
            this._eventStream.post(new EnvironmentChanged(newEnv));
        }
        this._environment = newEnv;
    }
}