import * as vscode from 'vscode';
import { BuildEnv } from '../common/shared';

class EnvironmentController implements vscode.Disposable {
    private _didChange: vscode.EventEmitter<BuildEnv>
    private _env: BuildEnv;
    private _configurationChangeListener: vscode.Disposable;

    public readonly onDidChange: vscode.Event<BuildEnv>;

    constructor() {
        this._didChange = new vscode.EventEmitter<BuildEnv>();
        this._env = this.getEnv();
        this._configurationChangeListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration('docs-build.environment')) {
                this.refreshEnv();
            }
        })

        this.onDidChange = this._didChange.event;
    }

    public get env(): BuildEnv {
        return this._env;
    }

    public dispose(): void {
        this._didChange.dispose();
        this._configurationChangeListener.dispose();
    }

    private getEnv(): BuildEnv {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docs-build', null);
        return extensionConfig.get<BuildEnv>("environment", "PROD");
    }

    private refreshEnv(): void {
        this._env = this.getEnv();
        this._didChange.fire(this._env);
    }
}

export const environmentController = new EnvironmentController();