import * as vscode from 'vscode';
import { BuildStatus } from '../common/shared';
import { buildController } from '../build/buildController';

class BuildStatusBarController implements vscode.Disposable {
    private _statusBar: vscode.StatusBarItem;
    private _buildStatusChangeListener: vscode.Disposable;

    constructor() {
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1023);
        this._buildStatusChangeListener = buildController.onDidChangeBuildStatus(
            (buildStatus) => this.updateStatusBar(buildStatus)
        );

        this.updateStatusBar(buildController.buildStatus);
        this._statusBar.show();
    }

    private updateStatusBar(buildStatus: BuildStatus) {
        let icon = '$(sync)';
        let command = '';
        let tooltip = '';
        switch (buildStatus) {
            case 'Ready':
                icon = '$(sync)';
                // TODO: support click the button to trigget build
                // command = 'docs.build';
                command = '';
                tooltip = 'Build Current workspace folder'
                break;
            case 'Building':
                icon = '$(sync~spin)';
                command = '';
                tooltip = 'Building the current workspace folder';
                break;
        }
        this._statusBar.text = icon;
        this._statusBar.command = command;
        this._statusBar.tooltip = tooltip;
    }

    public dispose(): void {
        this._statusBar.dispose();
        this._buildStatusChangeListener.dispose();
    }
}

export const buildStatusBarController = new BuildStatusBarController();