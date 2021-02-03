import cp from 'child_process';
import path from 'path';
import psTree from 'ps-tree';

import { EventStream } from '../common/eventStream';
import { BuildProgress } from '../common/loggingEvents';

const isWindows = (process.platform === 'win32');
const isMacintosh = (process.platform === 'darwin');
const isLinux = (process.platform === 'linux');

export function executeCommandSync(command: string, args?: ReadonlyArray<string>, options?: cp.ExecSyncOptionsWithStringEncoding): string {
    return cp.execSync(`${command} ${args}`, options).toString();
}

export function executeDocfx(
    command: string,
    eventStream: EventStream,
    exitHandler: (code: number, signal: string) => void,
    options?: cp.ExecOptions,
    stdoutHandler?: (data: string) => void,
    stdinInput?: string,
): cp.ChildProcess {
    const optionsWithFullEnvironment = {
        ...options,
        env: {
            ...process.env,
            ...options.env
        },
        maxBuffer: 100 * 1024 * 1024
    };

    eventStream.post(new BuildProgress(`& ${command}`));

    const childProc: cp.ChildProcess = cp.exec(command, optionsWithFullEnvironment);

    childProc.stdout.on("data", (data: string | Buffer) => {
        const str = data.toString();
        eventStream.post(new BuildProgress(str));
        if (stdoutHandler) {
            stdoutHandler(str);
        }
    });

    childProc.stderr.on("data", (data: string | Buffer) => {
        eventStream.post(new BuildProgress(data.toString()));
    });

    childProc.on("error", (err: Error) => {
        eventStream.post(new BuildProgress(`Running command "& ${command}" failed: ${err}`));
    });

    childProc.on("exit", exitHandler);

    if (stdinInput) {
        childProc.stdin.write(stdinInput);
        childProc.stdin.end();
    }
    return childProc;
}

// Hard kill the process
export function hardKillProcess(process: cp.ChildProcess): void {
    if (isWindows) {
        const options: any = {
            stdio: ['pipe', 'pipe', 'ignore']
        };
        cp.execFileSync('taskkill', ['/T', '/F', '/PID', process.pid.toString()], options);
    } else if (isLinux || isMacintosh) {
        const cmd = path.join(__dirname, 'terminateProcess.sh');
        (<any>cp).spawnSync(cmd, [process.pid.toString()]);
    } else {
        process.kill('SIGKILL');
    }
}

// Soft kill the process, the process will exit with the given signal, but it takes long which maybe longer than 5 seconds
// When the extension deactivated, it only have 5 seconds to do the clean up.
export async function softKillProcess(process: cp.ChildProcess): Promise<void> {
    process.kill('SIGKILL');
    await killProcessTree(process.pid);
}

async function killProcessTree(pid: number, signal?: string | number): Promise<void> {
    return new Promise((resolve, reject) => {
        signal = signal || 'SIGKILL';
        psTree(pid, function (err, children: psTree.PS[]) {
            if (err) {
                reject(err);
            } else {
                children.forEach((ps: psTree.PS) => {
                    process.kill(Number(ps.PID), signal);
                });
                resolve();
            }
        });
    });
}