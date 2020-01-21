import * as gulp from 'gulp';
import spawnNode from './spawnNode';
import { nycPath, unitTestCoverageRootPath, mochaPath } from './projectPaths';

require('./benchmarkTestTask');

gulp.task('test:e2e', async () => {
    // TODO: add e2e test
});

gulp.task('test:component', async () => {
    // TODO: add component test
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