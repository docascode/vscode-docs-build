import fs from 'fs-extra';
import gitUrlParse from 'git-url-parse';
import glob from 'glob';
import gulp from 'gulp';
import path from 'path';
import { runTests } from "vscode-test";

import { BenchmarkReport } from '../src/shared';
import { formatDuration,safelyReadJsonFile } from '../src/utils/utils';
import { convertBenchmarkResultToMarkdown, downloadLatestTestRepo } from './benchmarkHelper';
import { benchmarkTestAssetsPath, benchmarkTestReportsPath,rootPath } from './projectPaths';

interface TestRepo {
    url: string;
    branch: string;
}

const benchmarkTestRepos = <TestRepo[]>[
    { url: "https://github.com/MicrosoftDocs/azure-docs-pr", branch: "docs-build-v3" },
    { url: "https://github.com/MicrosoftDocs/sql-docs-pr", branch: "master" },
    { url: "https://github.com/dotnet/docs", branch: "master" },
    { url: "https://github.com/MicrosoftDocs/edge-developer", branch: "master" }
];

gulp.task('test:benchmark:runTest', async () => {
    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, 'out/test/benchmarkTests/index');
    const githubToken = process.env.VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error('Cannot get "VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN" from environment variable');
    }
    const extensionTestsEnv = {
        'VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN': githubToken
    };

    fs.ensureDirSync(benchmarkTestAssetsPath);
    fs.ensureDirSync(benchmarkTestReportsPath);
    fs.emptyDirSync(benchmarkTestReportsPath);

    for (const repo of benchmarkTestRepos) {
        // Prepare test repository
        const repository = gitUrlParse(repo.url);
        console.log(`Running benchmark test on repository ${repository.name}...`);

        const testWorkspace = path.resolve(benchmarkTestAssetsPath, repository.name);

        downloadLatestTestRepo(repository, repo.branch, githubToken);

        // Download VS Code, unzip it and run the integration test
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            extensionTestsEnv,
            launchArgs: [testWorkspace, '--disable-extensions',]
        });
    }
});

gulp.task('test:benchmark:generateReport', async () => {
    const reports = glob.sync('**', { cwd: benchmarkTestReportsPath });
    const result: any = {};
    console.log(`${reports.length} reports found`);
    reports.forEach(r => {
        const report = <BenchmarkReport>safelyReadJsonFile(path.join(benchmarkTestReportsPath, r));
        console.log(`Parsing report for repository ${report.name}...`);
        console.log(`  This test is running against commit: ${report.commit}`);
        let duration = 0;
        let count = 0;
        report.items.forEach(item => {
            if (item.isInitialRun) {
                console.log(`  Initial run takes: ${formatDuration(item.totalDuration)}`);
            } else {
                duration += item.totalDuration;
                count++;
            }
        });
        const averageDuration = Math.floor(duration / count);
        const formattedDuration = formatDuration(averageDuration);
        console.log(`  ${count} build round, average time: ${formattedDuration}(${averageDuration}ms)`);
        result[report.name] = formattedDuration;
    });
    console.log(`Benchmark Report:\n${convertBenchmarkResultToMarkdown(result)}`);
});

gulp.task('test:benchmark', gulp.series(
    'test:benchmark:runTest',
    'test:benchmark:generateReport'
));