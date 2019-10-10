/**
 * The entry for running from command line.
 */
'use strict';

const cmdParams = require('commander');

const {logger} = require('../logger');
const migrate = require('./main');

let start = process.hrtime();
// parse arguments
cmdParams
  .option('-d, --directory [dir]', 'The local git worktree [optional]')
  .option('-r, --repository [repo]', 'The git repository url(it should be https)')
  .option('-b, --branch [branch]', 'The git repository branch[optional]')
  .option('-o, --output-directory [output-dir]', 'Output directory for the generated `docfx.yml`[optional]')
  .option('-t, --op-build-user-token [op-build-api-header-token]', 'Token used for invoking OPS APIs[optional]')
  .option('-l, --log-directory [log-file-directory]', 'The directory of the log file, log file name is always .errors.log')
  .option('-e, --env [env]', 'The repository environment(`prod`, `sandbox`, `internal`, `perf`)[optional]')
  .option('--host-name [host-name]', 'Pass site host name')
  .option('--base-path [base-path]', 'The docset publish base path')
  .option('--product-name [product-name]', 'The docset product name')
  .option('--user-cache', 'Add git-hub config property to config')
  .option('--scan-redirection', 'Scan all .md files\' metadata and resolve redirections(attention, this is not optimized and may cause long running time)')
  .option('--site-name [site-name]', 'The docset site name')
  .parse(process.argv);

(async () => {
    try {
        // write-file is not visible when run `migrate.js` directly,
        // but settable when invoking main migrate(in `main.js`) function
        // when invoking main migrate function via command line, write-file flag is automatically added
        cmdParams.writeFile = true;
        if (!await migrate(cmdParams)) {
            throw new Error('migration failed');
        }
        let end = process.hrtime(start);
        logger.info (`migration succeeded in ${end[0]}.${end[1]}s`);
    } catch (error) {
        process.exitCode = 1;
        logger.error(`[migrate.entry] ${error}`);
        console.log(error);
    }
})();
