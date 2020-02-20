import vscode from 'vscode';
import { Environment, EXTENSION_NAME } from '../shared';
import { EnvironmentChanged } from './loggingEvents';
import { EventStream } from './eventStream';
import { EnvironmentController } from './environmentController';

const ENVIRONMENT_CONFIG_NAME = 'environment';

export class DocsEnvironmentController implements EnvironmentController, vscode.Disposable {
    private environment: Environment;
    private configurationChangeListener: vscode.Disposable;

    constructor(private eventStream: EventStream) {
        this.refreshEnv();
        this.configurationChangeListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${EXTENSION_NAME}.${ENVIRONMENT_CONFIG_NAME}`)) {
                this.refreshEnv();
            }
        });
    }

    public dispose(): void {
        this.configurationChangeListener.dispose();
    }

    public get env(): Environment {
        return this.environment;
    }

    private getEnv(): Environment {
        const extensionConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(EXTENSION_NAME, undefined);
        return extensionConfig.get<Environment>(ENVIRONMENT_CONFIG_NAME, 'PROD');
    }

    private refreshEnv(): void {
        let newEnv = this.getEnv();
        if(this.environment && this.environment !== newEnv){
            this.eventStream.post(new EnvironmentChanged(newEnv));
        }
        this.environment = newEnv;
    }
}