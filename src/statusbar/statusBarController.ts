import * as vscode from 'vscode';
import { DocsAccount } from '../common/shared';
import { credentialController } from '../credential/credentialController';

class StatusBarController implements vscode.Disposable {
    private statusBar: vscode.StatusBarItem;
    constructor(docsAccount: DocsAccount) {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        docsAccount.onStatusChanged((docsAccount) => this.updateStatusBar(docsAccount));
        this.updateStatusBar(docsAccount);
        this.statusBar.show();
    }

    private updateStatusBar(docsAccount: DocsAccount,) {
        let text = 'Docs: ';
        let command = undefined;
        switch (docsAccount.status) {
            case 'SigningIn':
                text += 'Signing In';
                break;
            case 'SignedIn':
                text += docsAccount.signInType == 'Github' ? '$(mark-github) ' : '$(rocket) ';
                text += `${docsAccount.userInfo!.userName}(${docsAccount.userInfo!.userEmail})`;
                break;
            case 'SignedOut':
                text += 'Sign in to Docs';
                command = 'docs.signIn';
                break;
            case 'Initializing':
            default:
                text += 'Initializing';
        }
        this.statusBar.text = text;
        this.statusBar.command = command;
    }

    public dispose(): void {
        this.statusBar.dispose();
    }
}

export const statusBarController = new StatusBarController(credentialController.account);