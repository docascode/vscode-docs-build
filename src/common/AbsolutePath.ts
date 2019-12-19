import * as path from "path";

export class AbsolutePath{
    constructor(public value: string) {
        if (!path.isAbsolute(value)) {
            throw new Error("The path must be absolute");
        }
    }

    public static getAbsolutePath(...pathSegments: string[]): AbsolutePath {
        return new AbsolutePath(path.resolve(...pathSegments));
    }
}