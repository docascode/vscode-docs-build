import { StatusBarItem } from 'vscode';
import { BaseEvent } from '../common/loggingEvents';

export abstract class BaseStatusBarItemObserver {

    constructor(private statusBarItem: StatusBarItem) {
    }

    public SetAndShowStatusBar(text: string, command: string, color?: string, tooltip?: string) {
        this.statusBarItem.text = text;
        this.statusBarItem.command = command;
        this.statusBarItem.color = color;
        this.statusBarItem.tooltip = tooltip;
        this.statusBarItem.show();
    }

    public ResetAndHideStatusBar() {
        this.statusBarItem.text = undefined;
        this.statusBarItem.command = undefined;
        this.statusBarItem.color = undefined;
        this.statusBarItem.tooltip = undefined;
        this.statusBarItem.hide();
    }

    abstract eventHandler: (event: BaseEvent) => void;
}