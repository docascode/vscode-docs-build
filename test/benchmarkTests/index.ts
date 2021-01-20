import fs from 'fs-extra';
import converter from 'number-to-words';
import path from 'path';
import { createSandbox } from 'sinon';
import vscode from 'vscode';

import { EventType } from "../../src/common/eventType";
import { BaseEvent, BuildCompleted,DocfxBuildCompleted, DocfxRestoreCompleted, RefreshCredential } from "../../src/common/loggingEvents";
import { BenchmarkReport, ReportItem, UserInfo } from "../../src/shared";
import { formatDuration, getRepositoryInfoFromLocalFolder } from "../../src/utils/utils";
import { setupKeyChain } from '../utils/faker';
import { ensureExtensionActivatedAndInitializationFinished, triggerCommand } from "../utils/testHelper";

const testRound = 3;

export function run(): Promise<void> {
    return new Promise(async (resolve, reject) => {
        let buildCount = 0;
        const sinon = createSandbox();
        let start: number;
        let restoreStart: number;
        let buildStart: number;
        let restoreDuration = 0;
        let buildDuration = 0;
        let totalDuration = 0;
        const workspace = vscode.workspace.workspaceFolders[0];
        const [, url, branch, commit] = await getRepositoryInfoFromLocalFolder(workspace.uri.fsPath);
        const report = <BenchmarkReport>{
            name: workspace.name,
            url,
            branch,
            commit,
            items: []
        };
        const extension = await ensureExtensionActivatedAndInitializationFinished();
        const { eventStream, keyChain } = extension.exports;

        const subscription = eventStream.subscribe((event: BaseEvent) => {
            switch (event.type) {
                case EventType.UserSignInCompleted:
                    console.log(`Trigger build to restore all the dependency...`);
                    triggerBuild();
                    break;
                case EventType.BuildInstantReleased:
                    handleBuildInstantReleased();
                    break;
                case EventType.DocfxRestoreStarted:
                    restoreStart = Date.now();
                    break;
                case EventType.DocfxRestoreCompleted:
                    handleDocfxRestoreCompleted(<DocfxRestoreCompleted>event);
                    break;
                case EventType.DocfxBuildStarted:
                    buildStart = Date.now();
                    break;
                case EventType.DocfxBuildCompleted:
                    handleDocfxBuildCompleted(<DocfxBuildCompleted>event);
                    break;
                case EventType.BuildCompleted:
                    handleBuildCompleted(<BuildCompleted>event);
                    break;
            }
        });

        // Prepare
        setupAvailableKeyChain();

        // Refresh the credential, after credential refreshed, trigger the build
        eventStream.post(new RefreshCredential());

        function setupAvailableKeyChain() {
            if (!process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN) {
                throw new Error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN" from environment variable');
            }
            setupKeyChain(sinon, keyChain, <UserInfo>{
                signType: 'GitHub',
                userName: 'VSC-Service-Account',
                userEmail: 'vscavu@microsoft.com',
                userToken: process.env.VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN
            });
        }

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

        function handleDocfxRestoreCompleted(event: DocfxRestoreCompleted) {
            if (event.result === 'Succeeded') {
                restoreDuration = Date.now() - restoreStart;
                console.log(`  'Docfx restore' finished in ${formatDuration(restoreDuration)}`);
            } else {
                exitTest(1);
            }
        }

        function handleDocfxBuildCompleted(event: DocfxBuildCompleted) {
            if (event.result === 'Succeeded') {
                buildDuration = Date.now() - buildStart;
                console.log(`  'Docfx build' finished in ${formatDuration(buildDuration)}`);
            } else {
                exitTest(1);
            }
        }

        function handleBuildCompleted(event: BuildCompleted) {
            if (event.result === 'Succeeded') {
                totalDuration = Date.now() - start;
                console.log(`  Build job finished in ${formatDuration(buildDuration)}`);
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