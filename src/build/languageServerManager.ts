import { BaseEvent } from '../common/loggingEvents';
import vscode from 'vscode';
import { EventType } from '../common/eventType';
import { EnvironmentController } from '../common/environmentController';

export class LanguageServerManager {
    constructor(private _environmentController: EnvironmentController) { }

    public eventHandler = (event: BaseEvent) => {
        switch (event.type) {
            case EventType.ExtensionActivated:
                if (this._environmentController.userType && this._environmentController.enableAutomaticRealTimeValidation) {
                    vscode.commands.executeCommand('docs.enableRealTimeValidation');
                }
                break;
        }
    }
}
