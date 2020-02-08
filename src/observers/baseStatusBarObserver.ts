import { StatusBarItem } from 'vscode';
import { BaseEvent } from '../common/loggingEvents';

export abstract class BaseStatusBarObserver {
    private statusBarItem: StatusBarItem;

    constructor(statusBarItem: StatusBarItem) {
        this.statusBarItem = statusBarItem;
    }

    public setAndShowStatusBar(text: string, command: string, color?: string, tooltip?: string) {
        this.statusBarItem.text = text;
        this.statusBarItem.command = command;
        this.statusBarItem.color = color;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.show();
    }

    public resetAndHideStatusBar() {
        this.statusBarItem.text = undefined;
        this.statusBarItem.command = undefined;
        this.statusBarItem.color = undefined;
        this.statusBarItem.tooltip = undefined;
        this.statusBarItem.hide();
    }

    abstract eventHandler: (event: BaseEvent) => void;
}