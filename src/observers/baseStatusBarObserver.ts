import { StatusBarItem } from 'vscode';

import { BaseEvent } from '../common/loggingEvents';

export abstract class BaseStatusBarObserver {
    constructor(private _statusBarItem: StatusBarItem) {
    }

    public setAndShowStatusBar(text: string, command: string, color?: string, tooltip?: string): void {
        this._statusBarItem.text = text;
        this._statusBarItem.command = command;
        this._statusBarItem.color = color;
        this._statusBarItem.tooltip = tooltip;
        this._statusBarItem.show();
    }

    public resetAndHideStatusBar(): void {
        this._statusBarItem.text = undefined;
        this._statusBarItem.command = undefined;
        this._statusBarItem.color = undefined;
        this._statusBarItem.tooltip = undefined;
        this._statusBarItem.hide();
    }

    abstract eventHandler: (event: BaseEvent) => void;
}