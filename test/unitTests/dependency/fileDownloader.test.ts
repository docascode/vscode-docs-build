import assert from 'assert';
import { MockHttpsServer } from "../../utils/mockHttpsServer";
import { downloadFile } from "../../../src/dependency/fileDownloader";
import { EventStream } from "../../../src/common/eventStream";
import TestEventBus from "../../utils/testEventBus";
import { DownloadStarted, DownloadSizeObtained, DownloadProgress, DownloadValidating, DownloadIntegrityCheckFailed } from "../../../src/common/loggingEvents";

describe(`fileDownloader`, () => {
    const downloadDescription = 'Test FileDownloader';
    const correctUrlPath = '/resource';
    const redirectUrlPath = '/redirectResource';
    const errorUrlPath = '/errorResource';
    const correctResourceContent = 'Test Content';
    const correctResourceIntegrity = '60c9b75f15144a088fd7800e1049c6c80a92e76de588c2b21b30ff42f6694ce2';
    const errorResourceIntegrity = 'error-integrity';

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
        describe(elem.description, async () => {
            it(`Download succeeds for matching integrity`, async () => {
                let buffer = await downloadFile(downloadDescription, getUrl(elem.urlPath), eventStream, correctResourceIntegrity, false);
                let text = buffer.toString();

                assert.equal(text, correctResourceContent, 'File is downloaded');
                assert.deepStrictEqual(eventBus.getEvents(), [
                    new DownloadStarted(downloadDescription),
                    new DownloadSizeObtained(12),
                    new DownloadProgress(100),
                    new DownloadValidating(),
                ], 'Events are created in the correct order');
            });

            it(`Download fails for non-matching integrity`, async () => {
                let errorThrown = false;
                try {
                    await downloadFile(downloadDescription, getUrl(elem.urlPath), eventStream, errorResourceIntegrity, false);
                } catch (err) {
                    errorThrown = true;
                    assert.deepStrictEqual(err, new Error('Failed integrity check.'));

                    assert.deepStrictEqual(eventBus.getEvents(), [
                        new DownloadStarted(downloadDescription),
                        new DownloadSizeObtained(12),
                        new DownloadProgress(100),
                        new DownloadValidating(),
                        new DownloadIntegrityCheckFailed(),
                    ], 'Events are created in the correct order');
                }
                assert.equal(errorThrown, true, 'Error is thrown');
            });

            it(`Download succeeds if no integrity provided`, async () => {
                let buffer = await downloadFile(downloadDescription, getUrl(elem.urlPath), eventStream, undefined, false);
                let text = buffer.toString();

                assert.equal(text, correctResourceContent, 'File is downloaded');
                assert.deepStrictEqual(eventBus.getEvents(), [
                    new DownloadStarted(downloadDescription),
                    new DownloadSizeObtained(12),
                    new DownloadProgress(100),
                ], 'Events are created in the correct order');
            });
        });
    });

    it(`Download Fails if the response status code is not 301, 302 or 200`, async () => {
        let errorThrown = false;
        let errorUrl = getUrl(errorUrlPath);

        try {
            await downloadFile(downloadDescription, errorUrl, eventStream, undefined, false);
        } catch (err) {
            errorThrown = true;
            assert.deepStrictEqual(err, new Error(`Failed to download from ${errorUrl}. Error code '404'`));

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