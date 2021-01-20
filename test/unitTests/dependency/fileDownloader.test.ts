import assert from 'assert';

import { EventStream } from "../../../src/common/eventStream";
import { DownloadProgress,DownloadSizeObtained, DownloadStarted } from "../../../src/common/loggingEvents";
import { downloadFile } from "../../../src/dependency/fileDownloader";
import { DocsError } from '../../../src/error/docsError';
import { ErrorCode } from '../../../src/error/errorCode';
import { MockHttpsServer } from "../../utils/mockHttpsServer";
import TestEventBus from "../../utils/testEventBus";

describe(`fileDownloader`, () => {
    const downloadDescription = 'Test FileDownloader';
    const correctUrlPath = '/resource';
    const redirectUrlPath = '/redirectResource';
    const errorUrlPath = '/errorResource';
    const correctResourceContent = 'Test Content';

    let server: MockHttpsServer;
    let eventStream: EventStream;
    let eventBus: TestEventBus;

    before(async () => {
        server = await MockHttpsServer.CreateMockHttpsServer();
        eventStream = new EventStream();
        eventBus = new TestEventBus(eventStream);

        await server.start();
        server.addRequestHandler('GET', correctUrlPath, 200, { "content-type": "text/plain" }, correctResourceContent);
        server.addRequestHandler('GET', errorUrlPath, 404);
        server.addRequestHandler('GET', redirectUrlPath, 301, { "location": getUrl(correctUrlPath) });
    });

    beforeEach(() => {
        eventBus.clear();
    });

    after(async () => {
        await server.stop();
        eventBus.dispose();
    });

    [
        {
            description: `Response status Code is 200`,
            urlPath: correctUrlPath
        },
        {
            description: `Response status Code is 301, redirect occurs`,
            urlPath: redirectUrlPath
        }
    ].forEach(elem => {
        it(elem.description, async () => {
            const buffer = await downloadFile(downloadDescription, getUrl(elem.urlPath), eventStream, false);
            const text = buffer.toString();

            assert.equal(text, correctResourceContent, 'File is downloaded');
            assert.deepStrictEqual(eventBus.getEvents(), [
                new DownloadStarted(downloadDescription),
                new DownloadSizeObtained(12),
                new DownloadProgress(100),
            ], 'Events are created in the correct order');
        });
    });

    it(`Download Fails if the response status code is not 301, 302 or 200`, async () => {
        let errorThrown = false;
        const errorUrl = getUrl(errorUrlPath);

        try {
            await downloadFile(downloadDescription, errorUrl, eventStream, false);
        } catch (err) {
            errorThrown = true;
            assert.deepStrictEqual(err, new DocsError(
                `Failed to download from '${server.baseUrl}/errorResource': Invalid status code (404)`,
                ErrorCode.DownloadFileFailed,
                new Error('Invalid status code (404)')));

            assert.deepStrictEqual(eventBus.getEvents(), [
                new DownloadStarted(downloadDescription)
            ], 'Events are created in the correct order');
        }
        assert.equal(errorThrown, true, 'Error is thrown');
    });

    function getUrl(path: string) {
        return `${server.baseUrl}${path}`;
    }
});