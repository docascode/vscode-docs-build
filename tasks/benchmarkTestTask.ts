import fs from 'fs-extra';
import gulp from 'gulp';
import path from 'path';
import glob from 'glob';
import { runTests } from "vscode-test";
import gitUrlParse = require('git-url-parse');
import { rootPath, benchmarkTestAssetsPath, benchmarkTestReportsPath } from './projectPaths';
import { safelyReadJsonFile, formatDuration } from '../src/utils/utils';
import { BenchmarkReport } from '../src/shared';
import { convertBenchmarkResultToMarkdown, downloadLatestTestRepo } from './benchmarkHelper';

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

    for (let repo of benchmarkTestRepos) {
        // Prepare test repository
        let repository = gitUrlParse(repo.url);
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
    let reports = glob.sync('**', { cwd: benchmarkTestReportsPath });
    let result: any = {};
    console.log(`${reports.length} reports found`);
    reports.forEach(r => {
        let report = <BenchmarkReport>safelyReadJsonFile(path.join(benchmarkTestReportsPath, r));
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
        let averageDuration = Math.floor(duration / count);
        let formattedDuration = formatDuration(averageDuration);
        console.log(`  ${count} build round, average time: ${formattedDuration}(${averageDuration}ms)`);
        result[report.name] = formattedDuration;
    });
    console.log(`Benchmark Report:\n${convertBenchmarkResultToMarkdown(result)}`);
});

gulp.task('test:benchmark', gulp.series(
    'test:benchmark:runTest',
    'test:benchmark:generateReport'
));