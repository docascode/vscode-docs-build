'use strict';

import gulp from 'gulp';

import { updateRuntimeDependencies } from './src/tools/updateRuntimeDependencies';

// eslint-disable-next-line node/no-missing-require
require('./tasks/testTasks');

// Disable warning about wanting an async function
gulp.task('updateRuntimeDependencies', async (): Promise<void> => {
    await updateRuntimeDependencies();
    return;
});