import { EnvironmentController } from '../common/environmentController';
import { EventStream } from '../common/eventStream';
import { EventType } from '../common/eventType';
import { BaseEvent, LSPMaxRetryHit, StartLanguageServerCompleted, UserSignInCompleted } from '../common/loggingEvents';
import config from '../config';
import { LanguageServerStatus } from '../shared';
import { BuildController } from './buildController';

export class LanguageServerManager {
    private _languageServerStatus: LanguageServerStatus = 'Idle';
    private _retryCount = 0;
    constructor(private _environmentController: EnvironmentController, private _buildController: BuildController, private _eventStream: EventStream) { }

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
                    this._retryCount = 0;
                } else {
                    this._languageServerStatus = 'Idle';
                    this._retryCount++;
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
        if (this._retryCount >= config.StartLanguageServerMaxTryCount) {
            this._eventStream.post(new LSPMaxRetryHit());
        } else if (this._languageServerStatus === 'Idle') {
            this._languageServerStatus = 'Starting';
            this._buildController.startDocfxLanguageServer();
        }
    }
}