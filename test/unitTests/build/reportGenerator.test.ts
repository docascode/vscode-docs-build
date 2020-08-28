import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import vscode from 'vscode';
import { EventStream } from '../../../src/common/eventStream';
import { SinonSandbox, createSandbox, SinonStub } from 'sinon';
import TestEventBus from '../../utils/testEventBus';
import { DiagnosticController } from '../../../src/build/diagnosticController';
import { Uri, Diagnostic, Range } from 'vscode';
import { visualizeBuildReport } from '../../../src/build/reportGenerator';
import { BuildProgress } from '../../../src/common/loggingEvents';

describe("ReportGenerator", () => {
    const testRepositoryPath = path.resolve(__dirname, "fakedFolder");
    const testLogPath = path.resolve(__dirname, ".errors.log");
    const fakedErrorLog = `{"message_severity":"info","log_item_type":"user","code":"author-missing","message":"Missing required attribute: 'author'. Add the current author's GitHub ID.","file":"index.md","line":1,"end_line":1,"column":1,"end_column":1,"date_time":"2020-03-04T08:43:12.3284386Z"}\n`
        + `{"message_severity":"warning","log_item_type":"user","code":"author-missing","message":"Missing required attribute: 'author'. Add the current author's GitHub ID.","file":"index.md","line":1,"end_line":1,"column":1,"end_column":1,"date_time":"2020-03-04T08:43:12.3284386Z"}\n`
        + `{"message_severity":"error","log_item_type":"user","code":"author-missing","message":"Missing required attribute: 'author'. Add the current author's GitHub ID.","file":"index.md","line":1,"end_line":1,"column":1,"end_column":1,"date_time":"2020-03-04T08:43:12.3284386Z"}\n`;

    let eventStream: EventStream;
    let testEventBus: TestEventBus;

    let sinon: SinonSandbox;
    let stubFsExistsSync: SinonStub;
    let stubFsReadFileSync: SinonStub;

    let diagnosticSet: {
        [key: string]: any;
    } = {};
    const fakedDiagnosticController = <DiagnosticController>{
        reset: () => {
            diagnosticSet = {};
        },
        setDiagnostic: (uri: Uri, diagnostics: Diagnostic[]) => {
            diagnosticSet[uri.fsPath] = {
                uri,
                diagnostics
            };
        }
    };

    const expectedInfoDiagnostic = new Diagnostic(new Range(0, 0, 0, 0), `Missing required attribute: 'author'. Add the current author's GitHub ID.`, vscode.DiagnosticSeverity.Hint);
    const expectedWarningDiagnostic = new Diagnostic(new Range(0, 0, 0, 0), `Missing required attribute: 'author'. Add the current author's GitHub ID.`, vscode.DiagnosticSeverity.Warning);
    const expectedErrorDiagnostic = new Diagnostic(new Range(0, 0, 0, 0), `Missing required attribute: 'author'. Add the current author's GitHub ID.`, vscode.DiagnosticSeverity.Error);
    expectedInfoDiagnostic.code = 'author-missing';
    expectedInfoDiagnostic.source = 'Docs Validation';
    expectedWarningDiagnostic.code = 'author-missing';
    expectedWarningDiagnostic.source = 'Docs Validation';
    expectedErrorDiagnostic.code = 'author-missing';
    expectedErrorDiagnostic.source = 'Docs Validation';
    const expectedFileUri = Uri.file(`${testRepositoryPath}/index.md`);
    expectedFileUri.fsPath;

    before(() => {
        eventStream = new EventStream();
        testEventBus = new TestEventBus(eventStream);
        sinon = createSandbox();

        stubFsExistsSync = sinon.stub(fs, "existsSync");
        stubFsReadFileSync = sinon.stub(fs, "readFileSync");
    });

    beforeEach(() => {
        testEventBus.clear();
    });

    after(() => {
        sinon.restore();
        testEventBus.dispose();
    });

    describe("No validation result", () => {
        before(() => {
            stubFsExistsSync
                .withArgs(path.normalize(testLogPath))
                .returns(false);
        });

        it("When there is no diagnostics in last build", () => {
            diagnosticSet = {};
            visualizeBuildReport(testRepositoryPath, testLogPath, fakedDiagnosticController, eventStream);

            assert.deepStrictEqual(diagnosticSet, {});
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new BuildProgress(`Log file (.error.log) not found. Skip generating report`)
            ]);
        });

        it("When there is some diagnostics in last build", () => {
            diagnosticSet = {
                "testPath": {}
            };
            visualizeBuildReport(testRepositoryPath, testLogPath, fakedDiagnosticController, eventStream);

            assert.deepStrictEqual(diagnosticSet, {});
            assert.deepStrictEqual(testEventBus.getEvents(), [
                new BuildProgress(`Log file (.error.log) not found. Skip generating report`)
            ]);
        });
    });

    it("Report found", () => {
        stubFsExistsSync
            .withArgs(path.normalize(testLogPath)).returns(true)
        stubFsReadFileSync
            .withArgs(path.normalize(testLogPath)).returns(fakedErrorLog)

        visualizeBuildReport(testRepositoryPath, testLogPath, fakedDiagnosticController, eventStream);

        assert.deepStrictEqual(diagnosticSet, {
            [path.normalize(`${testRepositoryPath}/index.md`)]: {
                uri: expectedFileUri,
                diagnostics: [
                    expectedInfoDiagnostic,
                    expectedWarningDiagnostic,
                    expectedErrorDiagnostic
                ]
            },
        });
        assert.deepStrictEqual(testEventBus.getEvents(), [
            new BuildProgress(`Log file found, Generating report...`),
        ]);
    });
}); 