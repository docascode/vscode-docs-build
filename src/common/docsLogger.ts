import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from "vscode";

import { ExtensionContext } from "../extensionContext";
import { EnvironmentController } from "./environmentController";
import { ILogger } from "./logger";

export class DocsLogger implements ILogger, vscode.Disposable {
    private _fileLogger: fs.WriteStream;

    constructor(private _outputChannel: vscode.OutputChannel, context: ExtensionContext, environmentController: EnvironmentController) {
        if (environmentController.debugMode) {
            const currentFormattedTime = new Date().toISOString().replace(/T/, '-').replace(/:/gm, '-').replace(/\..+/, '');
            const logFolder = path.resolve(context.extensionPath, '.logs');
            const logPath = path.resolve(logFolder, `${currentFormattedTime}-${vscode.workspace.name}.log`);
            fs.ensureDirSync(logFolder);
            this._fileLogger = fs.createWriteStream(logPath, {
                flags: 'as'
            });

            this.logSystemInfo(context);
        }
    }

    dispose(): void {
        if (this._fileLogger) {
            this._fileLogger.end("=====================");
        }
    }

    append(value: string): void {
        this._outputChannel.append(value);
        if (this._fileLogger) {
            this._fileLogger.write(value);
        }
    }

    appendLine(value: string): void {
        this._outputChannel.appendLine(value);
        if (this._fileLogger) {
            this._fileLogger.write('\n');
            this._fileLogger.write(value);
        }
    }

    private logSystemInfo(context: ExtensionContext) {
        this._fileLogger.write('=================================================\n');
        this._fileLogger.write(`VS Code version: ${vscode.version}\n`);
        this._fileLogger.write(`Docs validation extension version: ${context.extensionVersion}\n`);
        this._fileLogger.write(`Current workspace folder: ${vscode.workspace.name}\n`);
        this._fileLogger.write('=================================================\n\n');
    }
}