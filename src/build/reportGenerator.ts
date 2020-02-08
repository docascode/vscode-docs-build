import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { EventStream } from "../common/eventStream";
import { safelyReadJsonFile } from '../utils/utils';
import { OUTPUT_FOLDER_NAME, OP_CONFIG_FILE_NAME, EXTENSION_DIAGNOSTIC_SOURCE } from '../shared';
import { DiagnosticController } from './diagnosticController';
import { BuildProgress, ReportGenerationFailed } from '../common/loggingEvents';

interface Docset {
    docset_name: string;
    build_source_folder: string;
}

interface ReportItem {
    message_severity: MessageSeverity;
    log_item_type: LogItemType;
    code: string;
    message: string;
    file: string;
    line: number;
    end_line: number;
    column: number;
    end_column: number;
    date_time: Date;
}

const severityMap = new Map<MessageSeverity, vscode.DiagnosticSeverity>([
    ["error", vscode.DiagnosticSeverity.Error],
    ["warning", vscode.DiagnosticSeverity.Warning],
    ["info", vscode.DiagnosticSeverity.Hint],
    ["suggestion", vscode.DiagnosticSeverity.Information]
]);

const REPORT_FILENAME = '.errors.log';

type MessageSeverity = "error" | "warning" | "info" | "suggestion";
type LogItemType = 'system' | ' user';

export function visualizeBuildReport(repositoryPath: string, diagnosticController: DiagnosticController, eventStream: EventStream): boolean {
    try {
        let opConfigPath = path.join(repositoryPath, OP_CONFIG_FILE_NAME);
        let opConfig = safelyReadJsonFile(opConfigPath);
        let docsets = <Docset[]>opConfig.docsets_to_publish;
        for (let docset of docsets) {
            visualizeBuildReportForDocset(repositoryPath, docset, diagnosticController, eventStream);
        }
        return true;
    } catch (err) {
        eventStream.post(new ReportGenerationFailed(err.message));
        return false;
    }
}

function visualizeBuildReportForDocset(repositoryPath: string, docset: Docset, diagnosticController: DiagnosticController, eventStream: EventStream) {
    eventStream.post(new BuildProgress(`Generating report for docset ${docset.docset_name}...`));
    let reportFilePath = path.join(repositoryPath, OUTPUT_FOLDER_NAME, docset.build_source_folder, REPORT_FILENAME);
    if (!fs.existsSync(reportFilePath)) {
        eventStream.post(new BuildProgress(`Log file (.error.log) not found. Skip generating report for current docset '${docset.docset_name}'`));
        return;
    }

    let report = fs.readFileSync(reportFilePath).toString().split('\n').filter(item => item);
    let diagnosticsSet = new Map<string, any>();
    report.forEach(item => {
        let reportItem = <ReportItem>JSON.parse(item);

        if (!reportItem.file) {
            return;
        }
        let range = new vscode.Range(
            convertToZeroBased(reportItem.line),
            convertToZeroBased(reportItem.column),
            convertToZeroBased(reportItem.end_line),
            convertToZeroBased(reportItem.end_column));
        let diagnostic = new vscode.Diagnostic(range, reportItem.message, severityMap.get(reportItem.message_severity));
        diagnostic.code = reportItem.code;
        diagnostic.source = EXTENSION_DIAGNOSTIC_SOURCE;

        let sourceFile = path.join(docset.build_source_folder, reportItem.file);
        if (!diagnosticsSet.has(sourceFile)) {
            diagnosticsSet.set(sourceFile, {
                uri: vscode.Uri.file(path.resolve(repositoryPath, sourceFile)),
                diagnostics: []
            });
        }
        diagnosticsSet.get(sourceFile).diagnostics.push(diagnostic);

        function convertToZeroBased(num: number) {
            let zeroBased = num - 1;
            return zeroBased < 0 ? 0 : zeroBased;
        }
    });

    diagnosticController.reset();
    diagnosticsSet.forEach((value) => {
        diagnosticController.setDiagnostic(value.uri, value.diagnostics);
    });
}