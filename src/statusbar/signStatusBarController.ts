import * as vscode from 'vscode';
import { credentialController } from '../credential/credentialController';
import { environmentController } from '../build/environmentController';

class SignStatusBarController implements vscode.Disposable {
    private _statusBar: vscode.StatusBarItem;
    private _credentialChangeListener: vscode.Disposable;

    constructor() {
        this._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1024);
        this._credentialChangeListener = credentialController.onDidChangeCredential(() => this.updateStatusBar());

        this.updateStatusBar();
        this._statusBar.show();
    }

    private updateStatusBar() {
        let text = environmentController.env === 'PPE' ? 'Docs(Sandbox): ' : 'Docs: ';
        let command = undefined;
        switch (credentialController.signInStatus) {
            case 'SigningIn':
                text += 'Signing In';
                break;
            case 'SignedIn':
                text += credentialController.userInfo!.signType == 'Github' ? '$(mark-github) ' : '$(rocket) ';
                text += `${credentialController.userInfo!.userName}(${credentialController.userInfo!.userEmail})`;
                break;
            case 'SignedOut':
                text += 'Sign in to Docs';
                command = 'docs.signIn';
                break;
            case 'Initializing':
            default:
                text += 'Initializing';
        }
        this._statusBar.text = text;
        this._statusBar.command = command;
    }

    public dispose(): void {
        this._statusBar.dispose();
        this._credentialChangeListener.dispose();
    }
}

export const signStatusBarController = new SignStatusBarController();