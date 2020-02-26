import vscode from 'vscode';
import { EnvironmentController } from "./common/environmentController";
import config from "./config";
import TelemetryReporter from "vscode-extension-telemetry";
import { EXTENSION_ID } from "./shared";
import { ExtensionContext } from "./extensionContext";

const TELEMETRY_CONFIG_ID = 'telemetry';
const TELEMETRY_CONFIG_ENABLED_ID = 'enableTelemetry';

export class DocsTelemetryReporter implements vscode.Disposable {
    public telemetryEnabled: boolean;

    private configListener: vscode.Disposable;

    constructor() {
        this.updateUserOptIn();
        this.configListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
            if (event.affectsConfiguration(`${TELEMETRY_CONFIG_ID}.${TELEMETRY_CONFIG_ENABLED_ID}`)) {
                this.updateUserOptIn();
            }
        });
    }

    public static getTelemetryReporter(context: ExtensionContext, environmentController: EnvironmentController) {
        let key = config.AIKey[environmentController.env];
        return new TelemetryReporter(EXTENSION_ID, context.extensionVersion, key);
    }

    public dispose() {
        this.configListener.dispose();
    }

    private updateUserOptIn() {
        let config = vscode.workspace.getConfiguration(TELEMETRY_CONFIG_ID);
        let currentOpt = config.get(TELEMETRY_CONFIG_ENABLED_ID, true);
        if (this.telemetryEnabled !== currentOpt) {
            this.telemetryEnabled = currentOpt;
        }
    }
}

export const docsTelemetryReporter = new DocsTelemetryReporter();