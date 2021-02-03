import gulp from 'gulp';
import path from 'path';
import simpleGit, { CleanOptions } from 'simple-git';
import { runTests } from 'vscode-test';

import { isMacintosh } from '../src/utils/childProcessUtils';
import { defaultOutputPath, rootPath, testAssetsPath } from './projectPaths';

// eslint-disable-next-line node/no-missing-require
require('./benchmarkTestTask');

gulp.task('test:e2e', async () => {
    // TODO: remove this after vscode fixes the issue that the deactivate function is not called on mac
    // issue link: https://github.com/microsoft/vscode/issues/114688
    if (isMacintosh) {
        return;
    }

    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, './out/test/e2eTests/index');
    const testRepoPath = path.join(testAssetsPath, "vscode-docs-build-e2e-test");

    // Initialize Submodule
    let git = simpleGit(rootPath);
    await git.submoduleUpdate(['--init']);
    git = simpleGit(testRepoPath);
    await git.reset(['--hard']);
    await git.clean(CleanOptions.FORCE);

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
        throw new Error('Cannot get "GITHUB_TOKEN" from environment variable');
    }

    const extensionTestsEnv = {
        'VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN': githubToken,
        'VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER': defaultOutputPath
    };

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv,
        launchArgs: [testRepoPath, '--disable-extensions']
    });
});

gulp.task('test:unit', async () => {
    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, './out/test/unitTests/index');

    const extensionTestsEnv = {
        'VSCODE_DOCS_BUILD_EXTENSION_OUTPUT_FOLDER': defaultOutputPath
    };

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        extensionTestsEnv,
        launchArgs: ['--disable-extensions']
    });
});

gulp.task('test', gulp.series(
    'test:e2e',
    'test:unit'
));