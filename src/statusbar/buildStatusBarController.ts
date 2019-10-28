import * as vscode from 'vscode';
import { DocsAccount, BuildStatus } from '../common/shared';
import { credentialController } from '../credential/credentialController';
import { buildController } from '../build/buildController';

class BuildStatusBarController implements vscode.Disposable {
    private statusBar: vscode.StatusBarItem;
    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1023);
        buildController.onStatusChanged((buildStatus) => this.updateStatusBar(buildStatus));
        this.updateStatusBar(buildController.getBuildStatus());
        this.statusBar.show();
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
        this.statusBar.text = icon;
        this.statusBar.command = command;
        this.statusBar.tooltip = tooltip;
    }

    public dispose(): void {
        this.statusBar.dispose();
    }
}

export const buildStatusBarController = new BuildStatusBarController();