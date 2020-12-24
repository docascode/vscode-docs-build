import { BaseEvent, StartLanguageServerCompleted, UserSignInCompleted } from '../common/loggingEvents';
import { EventType } from '../common/eventType';
import { EnvironmentController } from '../common/environmentController';
import { LanguageServerStatus } from '../shared';
import { BuildController } from './buildController';

export class LanguageServerManager {
    private _languageServerStatus: LanguageServerStatus = 'Idle';
    constructor(private _environmentController: EnvironmentController, private _buildController: BuildController) { }

    public eventHandler = (event: BaseEvent): void => {
        switch (event.type) {
            case EventType.ExtensionActivated:
                if (this._environmentController.userType && this._environmentController.enableAutomaticRealTimeValidation) {
                    this.startLanguageServer();
                }
                break;
            case EventType.StartLanguageServerCompleted:
                if ((<StartLanguageServerCompleted>event).succeeded) {
                    this._languageServerStatus = 'Running';
                } else {
                    this._languageServerStatus = 'Idle';
                }
                break;
            case EventType.UserSignInCompleted:
                if ((<UserSignInCompleted>event).succeeded && this._environmentController.enableAutomaticRealTimeValidation) {
                    this.startLanguageServer();
                }
                break;
        }
    }

    // For test only
    public getLanguageServerStatus(): LanguageServerStatus {
        return this._languageServerStatus;
    }

    public startLanguageServer(): void {
        if (this._languageServerStatus === 'Idle') {
            this._languageServerStatus = 'Starting';
            this._buildController.startDocfxLanguageServer();
        }
    }
}