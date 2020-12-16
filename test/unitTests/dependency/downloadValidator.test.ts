import * as assert from 'assert';
import { MockHttpsServer } from "../../utils/mockHttpsServer";
import { EventStream } from "../../../src/common/eventStream";
import TestEventBus from "../../utils/testEventBus";
import { DownloadValidating } from "../../../src/common/loggingEvents";
import { validateDownload } from '../../../src/dependency/downloadValidator';
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';

describe(`downloadChecker`, () => {
    const testBuffer = Buffer.from('test');
    const correctIntegrity = '9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08';
    const errorIntegrity = 'error-integrity';

    let server: MockHttpsServer;
    let eventStream: EventStream;
    let eventBus: TestEventBus;

    before(async () => {
        server = await MockHttpsServer.CreateMockHttpsServer();
        eventStream = new EventStream();
        eventBus = new TestEventBus(eventStream);

        await server.start();
    });

    beforeEach(() => {
        eventBus.clear();
    });

    after(async () => {
        await server.stop();
        eventBus.dispose();
    });

    it(`IntegrityCheck Passed`, async () => {
        validateDownload(eventStream, testBuffer, correctIntegrity);

        assert.deepStrictEqual(eventBus.getEvents(), [
            new DownloadValidating(),
        ], 'Events are created in the correct order');
    });

    it(`IntegrityCheck Failed`, async () => {
        let errorThrown = false;
        try {
            validateDownload(eventStream, testBuffer, errorIntegrity);
        } catch (err) {
            errorThrown = true;
            assert.deepStrictEqual(err, new DocsError(`Integrity check failed.`, ErrorCode.CheckIntegrityFailed));

            assert.deepStrictEqual(eventBus.getEvents(), [
                new DownloadValidating(),
            ], 'Events are created in the correct order');
        }
        assert.equal(errorThrown, true, 'Error is thrown');
    });
});