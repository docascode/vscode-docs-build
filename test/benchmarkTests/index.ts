import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { ensureExtensionActivatedAndInitializationFinished, setupAvailableMockKeyChain, triggerCommand } from "../utils/testHelper";
import { BaseEvent, DocfxBuildFinished, DocfxRestoreFinished, RefreshCredential } from "../../src/common/loggingEvents";
import { createSandbox } from 'sinon';
import { EventType } from "../../src/common/eventType";
import * as converter from 'number-to-words';
import { formatDuration, getRepositoryInfoFromLocalFolder } from "../../src/utils/utils";
import { ReportItem, BenchmarkReport } from "../../src/shared";

const testRound = 3;

export function run(): Promise<void> {
    // tslint:disable-next-line: promise-must-complete
    return new Promise(async (resolve, reject) => {
        let buildCount = 0;
        let sinon = createSandbox();
        let start: number;
        let restoreStart: number;
        let buildStart: number;
        let restoreDuration = 0;
        let buildDuration = 0;
        let totalDuration = 0;
        let workspace = vscode.workspace.workspaceFolders[0];
        // TODO: get commit time as well
        // TODO: upload report to CI artifacts
        let [url, branch, commit] = await getRepositoryInfoFromLocalFolder(workspace.uri.fsPath);
        let report = <BenchmarkReport>{
            name: workspace.name,
            url,
            branch,
            commit,
            items: []
        };
        const extension = await ensureExtensionActivatedAndInitializationFinished();
        const { eventStream, keyChain } = extension.exports;

        let subscription = eventStream.subscribe((event: BaseEvent) => {
            switch (event.type) {
                case EventType.CredentialRetrieveFromLocalCredentialManager:
                    console.log(`Trigger build to restore all the dependency...`);
                    triggerBuild();
                    break;
                case EventType.BuildInstantReleased:
                    handleBuildInstantReleased();
                    break;
                case EventType.DocfxRestoreStarted:
                    restoreStart = Date.now();
                    break;
                case EventType.DocfxRestoreFinished:
                    handleDocfxRestoreFinished(<DocfxRestoreFinished>event);
                    break;
                case EventType.DocfxBuildStarted:
                    buildStart = Date.now();
                    break;
                case EventType.DocfxBuildFinished:
                    handleDocfxBuildFinished(<DocfxBuildFinished>event);
                    break;
                case EventType.BuildJobSucceeded:
                    totalDuration = Date.now() - start;
                    console.log(`  Build job finished in ${formatDuration(buildDuration)}`);
                    break;
                case EventType.BuildTriggerFailed:
                case EventType.BuildJobFailed:
                    exitTest(1);
            }
        });

        // Prepare
        setupAvailableMockKeyChain(sinon, keyChain);

        // Refresh the credential
        eventStream.post(new RefreshCredential());

        function triggerBuild() {
            restoreDuration = 0;
            buildDuration = 0;
            totalDuration = 0;

            start = Date.now();
            triggerCommand('docs.build');
        }

        function handleBuildInstantReleased() {
            report.items.push(<ReportItem>{
                totalDuration,
                restoreDuration,
                buildDuration,
                isInitialRun: buildCount === 0
            });
            if (buildCount < testRound) {
                buildCount++;
                console.log(`Running the ${converter.toOrdinal(buildCount)} round build...`);

                triggerBuild();
            } else {
                saveReport();
                exitTest(0);
            }
        }

        function handleDocfxRestoreFinished(event: DocfxRestoreFinished) {
            if ((<DocfxRestoreFinished>event).exitCode === 0) {
                restoreDuration = Date.now() - restoreStart;
                console.log(`  'Docfx restore' finished in ${formatDuration(restoreDuration)}`);
            } else {
                exitTest(1);
            }
        }

        function handleDocfxBuildFinished(event: DocfxBuildFinished) {
            if ((<DocfxBuildFinished>event).exitCode === 0) {
                buildDuration = Date.now() - buildStart;
                console.log(`  'Docfx build' finished in ${formatDuration(buildDuration)}`);
            } else {
                exitTest(1);
            }
        }

        function exitTest(exitCode: number) {
            subscription.unsubscribe();
            if (exitCode === 0) {
                resolve();
            } else {
                reject();
            }
        }

        function saveReport() {
            const reportsFolderPath = path.join(extension.extensionPath, '.benchmark/reports');
            fs.ensureDirSync(reportsFolderPath);
            fs.writeFileSync(path.join(reportsFolderPath, `${report.name}.json`), JSON.stringify(report));
        }
    });
}