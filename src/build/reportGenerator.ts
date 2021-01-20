import fs from 'fs-extra';
import path from 'path';
import vscode from 'vscode';

import { EventStream } from "../common/eventStream";
import { BuildProgress } from '../common/loggingEvents';
import { DocsError } from '../error/docsError';
import { ErrorCode } from '../error/errorCode';
import { EXTENSION_DIAGNOSTIC_SOURCE } from '../shared';
import { DiagnosticController } from './diagnosticController';

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
    pull_request_only: boolean;
}

const severityMap = new Map<MessageSeverity, vscode.DiagnosticSeverity>([
    ["error", vscode.DiagnosticSeverity.Error],
    ["warning", vscode.DiagnosticSeverity.Warning],
    ["info", vscode.DiagnosticSeverity.Hint],
    ["suggestion", vscode.DiagnosticSeverity.Information]
]);

const configFile = '.openpublishing.publish.config.json';

type MessageSeverity = "error" | "warning" | "info" | "suggestion";
type LogItemType = 'system' | ' user';

export function visualizeBuildReport(repositoryPath: string, logPath: string, diagnosticController: DiagnosticController, eventStream: EventStream): void {
    try {
        diagnosticController.reset();

        if (!fs.existsSync(logPath)) {
            eventStream.post(new BuildProgress(`Log file (.error.log) not found. Skip generating report`));
            return;
        }
        eventStream.post(new BuildProgress(`Log file found, Generating report...`));

        const report = fs.readFileSync(logPath).toString().split('\n').filter(item => item);
        const diagnosticsSet = new Map<string, any>();
        report.forEach(item => {
            const reportItem = <ReportItem>JSON.parse(item);

            if (reportItem.pull_request_only) {
                return;
            }

            const range = new vscode.Range(
                convertToZeroBased(reportItem.line ?? 0),
                convertToZeroBased(reportItem.column ?? 0),
                convertToZeroBased(reportItem.end_line ?? 0),
                convertToZeroBased(reportItem.end_column ?? 0));
            const diagnostic = new vscode.Diagnostic(range, reportItem.message, severityMap.get(reportItem.message_severity));
            diagnostic.code = reportItem.code;
            diagnostic.source = EXTENSION_DIAGNOSTIC_SOURCE;

            const sourceFile = reportItem.file ?? configFile;
            if (!diagnosticsSet.has(sourceFile)) {
                diagnosticsSet.set(sourceFile, {
                    uri: vscode.Uri.file(path.resolve(repositoryPath, sourceFile)),
                    diagnostics: []
                });
            }
            diagnosticsSet.get(sourceFile).diagnostics.push(diagnostic);

            function convertToZeroBased(num: number) {
                const zeroBased = num - 1;
                return zeroBased < 0 ? 0 : zeroBased;
            }
        });

        diagnosticsSet.forEach((value) => {
            diagnosticController.setDiagnostic(value.uri, value.diagnostics);
        });
    } catch (err) {
        throw new DocsError('Generating report failed', ErrorCode.GenerateReportFailed);
    }
}