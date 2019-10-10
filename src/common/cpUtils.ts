import * as cp from 'child_process';
import * as vscode from "vscode";
import { docsChannel } from './docsChannel';

export function executeCommandSync(command: string, args?: ReadonlyArray<string>, options?: cp.ExecSyncOptionsWithStringEncoding): string {
    return cp.execSync(`${command} ${args}`, options);
}

export async function executeCommand(
    command: string,
    stdoutHandler: (data: string | Buffer) => void,
    stderrHandler: (data: string | Buffer) => void,
    exitHandler: (code: Number) => void,
    options?: cp.ExecOptions
): Promise<void> {
    docsChannel.appendLine(`\n& ${command}`);

    const childProc: cp.ChildProcess = cp.exec(command, options);

    childProc.stdout.on("data", stdoutHandler);

    childProc.stderr.on("data", stderrHandler);

    childProc.on("error", err => {
        docsChannel.appendLine(`Running command "& ${command}" failed: ${err}`);
    });

    childProc.on("close", exitHandler);
}