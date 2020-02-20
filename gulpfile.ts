'use strict';

import gulp from 'gulp';
import * as packageDependencyUpdater from './src/tools/UpdateRuntimeDependencies';

require('./tasks/testTasks');

// Disable warning about wanting an async function
// tslint:disable-next-line
gulp.task('updateRuntimeDependencies', async (): Promise<void> => {
    await packageDependencyUpdater.updateRuntimeDependencies();
    return;
});