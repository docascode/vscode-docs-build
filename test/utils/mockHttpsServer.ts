
import * as getPort from 'get-port';
import * as fs from 'fs-extra';

// tslint:disable-next-line: variable-name
const ServerMock = require('mock-http-server');

export class MockHttpsServer {
    constructor(private server: any, public baseUrl: string) { }

    public addRequestHandler(method: string, path: string, replyStatus: number, replyHeaders?: any, replyBody?: any) {
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

    public async start() {
        return new Promise((resolve) => this.server.start(resolve));
    }

    public async stop() {
        return new Promise((resolve) => this.server.stop(resolve));
    }

    public static async CreateMockHttpsServer(): Promise<MockHttpsServer> {
        let port = await getPort();

        let server = new ServerMock(undefined, {
            host: "localhost",
            port: port,
            key: fs.readFileSync("test/unitTests/testAssets/key.pem"),
            cert: fs.readFileSync("test/unitTests/testAssets/cert.pem")
        });

        return new MockHttpsServer(server, `https://localhost:${port}`);
    }
}