import cp from 'child_process';
import { BuildProgress } from '../common/loggingEvents';
import { EventStream } from '../common/eventStream';

export function executeCommandSync(command: string, args?: ReadonlyArray<string>, options?: cp.ExecSyncOptionsWithStringEncoding): string {
    return cp.execSync(`${command} ${args}`, options).toString();
}

export function executeDocfx(
    command: string,
    eventStream: EventStream,
    exitHandler: (code: number, signal: string) => void,
    options?: cp.ExecOptions,
    stdinInput?: string,
): cp.ChildProcess {

    let optionsWithFullEnvironment = {
        ...options,
        env: {
            ...process.env,
            ...options.env
        },
        maxBuffer: 100 * 1024 *1024
    };

    eventStream.post(new BuildProgress(`& ${command}`));

    const childProc: cp.ChildProcess = cp.exec(command, optionsWithFullEnvironment);

    childProc.stdout.on("data", (data: string | Buffer) => {
        eventStream.post(new BuildProgress(data.toString()));
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