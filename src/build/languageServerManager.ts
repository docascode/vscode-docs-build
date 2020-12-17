import { BaseEvent, StartLanguageServerCompleted, UserSignInCompleted } from '../common/loggingEvents';
import vscode from 'vscode';
import { EventType } from '../common/eventType';
import { EnvironmentController } from '../common/environmentController';
import { LanguageServerStatus } from '../shared';

export class LanguageServerManager {
    private _languageServerStatus: LanguageServerStatus = 'Idle';
    constructor(private _environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.ExtensionActivated:
                if (this._environmentController.userType && this.readyToStartLanguageServer()) {
                    this._languageServerStatus = 'Starting';
                    vscode.commands.executeCommand('docs.enableRealTimeValidation');
                }
                break;
            case EventType.StartLanguageServerCompleted:
                if ((<StartLanguageServerCompleted>event).succeeded) {
                    this._languageServerStatus = 'Running';
                }
                break;
            case EventType.UserSignInCompleted:
                if ((<UserSignInCompleted>event).succeeded && this.readyToStartLanguageServer()) {
                    this._languageServerStatus = 'Starting';
                    vscode.commands.executeCommand('docs.enableRealTimeValidation');
                }
                break;
        }
    }

    public getLanguageServerStatus(): LanguageServerStatus {
        return this._languageServerStatus;
    }

    private readyToStartLanguageServer(): boolean {
        return this._environmentController.enableAutomaticRealTimeValidation && this._languageServerStatus === 'Idle';
    }
}