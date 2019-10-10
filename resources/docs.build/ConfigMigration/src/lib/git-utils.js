'use strict';

const execSync = require('child_process').execSync;
const { logger } = require('../logger');

/**
 * 
 * @param {*} message: commit message 
 * @param {*} directory: working direcotry
 */
function  commitWithSpecificDate (message, directory, timeStamp = "Thu 1 Jan 1970 00:00:00") {
    const command = `set GIT_AUTHOR_DATE="${timeStamp}" & set GIT_COMMITTER_DATE="${timeStamp}" & git commit -m "${message}"`;
    logger.info(`[git-utils.commitWithSpecificDate] ${command}`);
    execSync(command, { cwd: directory, stdio: "inherit" });
}

module.exports = commitWithSpecificDate;