import * as gulp from 'gulp';
import * as path from 'path';
import { rootPath } from './projectPaths';
import { runTests } from 'vscode-test';

require('./benchmarkTestTask');

gulp.task('test:e2e', async () => {
    // TODO: add e2e test
});

gulp.task('test:unit', async () => {
    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, './out/test/unitTests/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: ['--disable-extensions']
    });
});

gulp.task('test', gulp.series(
    'test:e2e',
    'test:unit'
));