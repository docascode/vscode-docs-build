import vscode from 'vscode';
import { Environment, DocsRepoType, EXTENSION_NAME, ENVIRONMENT_CONFIG_NAME, DEBUG_MODE_CONFIG_NAME, USER_TYPE, UserType } from '../shared';
import { EnvironmentChanged, UserTypeChange } from './loggingEvents';
import { EventStream } from './eventStream';
import { EnvironmentController } from './environmentController';
import { getRepositoryInfoFromLocalFolder } from '../utils/utils';

export class DocsEnvironmentController implements EnvironmentController, vscode.Disposable {
    private _environment: Environment;
    private _debugMode: boolean;
    private _docsRepoType: DocsRepoType;
    private _configurationChangeListener: vscode.Disposable;
    private _userType: UserType;

    constructor(private _eventStream: EventStream) {
    }

    public async initialize() {
        this._environment = this.getEnv();
        this._debugMode = this.getDebugMode();
        this._docsRepoType = await this.getDocsRepoType();
        this._userType = this.getUserType();

        this._configurationChangeListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${EXTENSION_NAME}.${ENVIRONMENT_CONFIG_NAME}`)) {
                this.refreshEnv();
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${DEBUG_MODE_CONFIG_NAME}`)) {
                this._debugMode = this.getDebugMode();
                this.reloadWindow();
            } else if (event.affectsConfiguration(`${EXTENSION_NAME}.${USER_TYPE}`)) {
                this._userType = this.getUserType();
                if (this._userType === UserType.PublicContributor) {
                    this._eventStream.post(new UserTypeChange(UserType.PublicContributor));
                }
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

    public get userType(): UserType {
        return this._userType;
    }

    private getEnv(): Environment {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<Environment>(ENVIRONMENT_CONFIG_NAME, 'PROD');
    }

    private getDebugMode(): boolean {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<boolean>(DEBUG_MODE_CONFIG_NAME, false);
    }

    private getUserType(): UserType {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<UserType>(USER_TYPE, UserType.Unknown);
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

    private async reloadWindow() {
        let selected = await vscode.window.showInformationMessage("This configuration change requires reloading your current window!", "Reload");
        if (selected) {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
    }
}