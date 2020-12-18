/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import getPort from 'get-port';
import fs from 'fs-extra';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ServerMock = require('mock-http-server');

export class MockHttpsServer {
    constructor(private server: any, public baseUrl: string) { }

    public addRequestHandler(method: string, path: string, replyStatus: number, replyHeaders?: any, replyBody?: any): void {
        this.server.on({
            method,
            path,
            reply: {
                status: replyStatus,
                headers: replyHeaders,
                body: replyBody
            }
        });
    }

    public async start(): Promise<unknown> {
        return new Promise((resolve) => this.server.start(resolve));
    }

    public async stop(): Promise<unknown> {
        return new Promise((resolve) => this.server.stop(resolve));
    }

    public static async CreateMockHttpsServer(): Promise<MockHttpsServer> {
        const port = await getPort();

        const server = new ServerMock(undefined, {
            host: "localhost",
            port: port,
            key: fs.readFileSync(path.resolve(__dirname, "../../../testAssets/key.pem")),
            cert: fs.readFileSync(path.resolve(__dirname, "../../../testAssets/cert.pem"))
        });

        return new MockHttpsServer(server, `https://localhost:${port}`);
    }
}