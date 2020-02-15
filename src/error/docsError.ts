import { ErrorCode } from "./errorCode";

export class DocsError extends Error {
    constructor(public message: string, public code: ErrorCode, public err: Error = undefined) {
        super(message);
    }
}