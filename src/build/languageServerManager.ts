import { BaseEvent, StartLanguageServerCompleted, UserSignInCompleted } from '../common/loggingEvents';
import vscode from 'vscode';
import { EventType } from '../common/eventType';
import { EnvironmentController } from '../common/environmentController';

export class LanguageServerManager {
    private _languageServerStarted = false;
    constructor(private _environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.ExtensionActivated:
                if (this._environmentController.userType && this._environmentController.enableAutomaticRealTimeValidation) {
                    vscode.commands.executeCommand('docs.enableRealTimeValidation');
                }
                break;
            case EventType.StartLanguageServerCompleted:
                if ((<StartLanguageServerCompleted>event).succeeded) {
                    this._languageServerStarted = true;
                }
                break;
            case EventType.UserSignInCompleted:
                if ((<UserSignInCompleted>event).succeeded && this._environmentController.enableAutomaticRealTimeValidation && !this._languageServerStarted) {
                    vscode.commands.executeCommand('docs.enableRealTimeValidation');
                }
                break;
        }
    }

    public getLanguageServerStarted(): boolean {
        return this._languageServerStarted;
    }
}