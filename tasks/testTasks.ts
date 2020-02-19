import * as gulp from 'gulp';
import * as path from 'path';
import spawnNode from './spawnNode';
import { nycPath, unitTestCoverageRootPath, mochaPath, rootPath } from './projectPaths';
import { runTests } from 'vscode-test';

require('./benchmarkTestTask');

gulp.task('test:e2e', async () => {
    // TODO: add e2e test
});

// TODO: merge component test and unit test
gulp.task('test:component', async () => {
    const extensionDevelopmentPath = rootPath;
    const extensionTestsPath = path.resolve(rootPath, './out/test/componentTests/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: ['--disable-extensions']
    });
});

gulp.task('test:unit', async () => {
    return spawnNode([
        nycPath,
        '-r',
        'lcovonly',
        '--report-dir',
        unitTestCoverageRootPath,
        mochaPath,
        '--require',
        'ts-node/register',
        '--color',
        '--ui',
        'bdd',
        '--',
        'test/unitTests/**/*.test.ts'
    ]);
});

gulp.task('test', gulp.series(
    'test:e2e',
    'test:component',
    'test:unit'
));