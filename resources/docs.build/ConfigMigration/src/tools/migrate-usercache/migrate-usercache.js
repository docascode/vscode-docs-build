/**
 * The entry for running from command line.
 */
'use strict';

const cmdParams = require('commander');

const { logger } = require('../../logger');
const { migrateUserCache } = require('./main');

let start = process.hrtime();
// parse arguments
cmdParams
    .option('-i, --input <input>', 'The input file path of the v2 version cache')
    .option('-o, --output <output>', 'The generated file path for v3 version cache')
    .parse(process.argv);

(async () => {
    try {
        migrateUserCache(cmdParams);
        let end = process.hrtime(start);
        logger.info(`[migrate-usercache] migration succeeded in ${end[0]}.${end[1]}s`);
    } catch (error) {
        process.exitCode = 1;
        logger.error(`[migrate-usercache.entry] ${error}`);
    }
})();