'use strict';

import * as gulp from 'gulp';
import * as path from 'path';
import * as packageDependencyUpdater from './src/tools/UpdateRuntimeDependencies';
import { runTests } from 'vscode-test';

// Disable warning about wanting an async function
// tslint:disable-next-line
gulp.task('updateRuntimeDependencies', async (): Promise<void> => {
    await packageDependencyUpdater.updateRuntimeDependencies();
    return;
});

gulp.task('test:e2e', async () => {
    // TODO: add e2e test
});

gulp.task('test:component', async () => {
    // TODO: add component test
});

gulp.task('test:unit', async () => {
    const extensionDevelopmentPath = path.resolve(__dirname, '.');
    const extensionTestsPath = path.resolve(__dirname, './out/test/unitTests/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: ['--disable-extensions',]
    });
});

gulp.task('test', gulp.series(
    'test:e2e',
    'test:component',
    'test:unit'
));