import { SpawnOptions, spawn } from "child_process";
import { rootPath, nodePath } from './projectPaths';
const { join } = require("async-child-process");

export default async function spawnNode(args?: string[], options?: SpawnOptions): Promise<{code: string; signal: string;}> {
    if (!options) {
        options = {
            env: {}
        };
    }
    
    let optionsWithFullEnvironment = {
        cwd: rootPath,
        ...options,
        env: {
            ...process.env,
            ...options.env
        }
    };
    
    console.log(`starting node ${args.join(' ')}`);

    let spawned = spawn(nodePath, args, optionsWithFullEnvironment);
    
    spawned.stderr.pipe(process.stdout);
    spawned.stdout.pipe(process.stdout);

    return join(spawned);
}