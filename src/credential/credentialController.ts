import * as vscode from 'vscode';

export class CredentialController implements vscode.Disposable {
    private _authenticationStatusBarItems: vscode.StatusBarItem;

    constructor() {
        this._authenticationStatusBarItems = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        this._authenticationStatusBarItems.show();
    }

    public async updateAuthenticationStatusBar() {
        
    }
}