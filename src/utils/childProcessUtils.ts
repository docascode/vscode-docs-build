import * as cp from 'child_process';

export function executeCommandSync(command: string, args?: ReadonlyArray<string>, options?: cp.ExecSyncOptionsWithStringEncoding): string {
    return cp.execSync(`${command} ${args}`, options).toString();
}