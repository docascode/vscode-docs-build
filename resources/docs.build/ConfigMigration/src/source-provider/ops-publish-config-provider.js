/**
 * Provide local/remote openpublish publish configuration.
 */
'use strict';

const path = require('path');

const constants = require('../../config/config');
const fsUtils = require('../lib/fs-utils');
const {logger} = require('../logger');
const opBuildApiClient  = require('../lib/op-build-api-client');

const getLocalOPPublishConfig = function (dir) {
    logger.info('[ops-publish-config-provider.getLocalOPPublishConfig] loading local `.openpublishing.publish.config.json`');
    let promise = new Promise((resolve, reject) => {
        let content = fsUtils.readFileSyncWithAutoEncoding(path.join(dir, constants.OP_PUBLISH_JSON_CONFIG_FILENAME));
        try {
            resolve(JSON.parse(content));
        } catch (error) {
            logger.error(constants.ERROR_MSG.JSON_SYNTAX_ERROR, {
                code: 'invalid-json-syntax',
                type: 'User',
                file: constants.OP_PUBLISH_JSON_CONFIG_FILENAME
            });
            reject(error);
        }
    })
    return promise;
}

/**
 * @deprecated, since op config.json is now always loaded from local file, this function shouldn't be used.
 * Get remote docsets info from OP build API server.
 * Mockup by reading from a local file for the moment.
 */
const getRemoteOPPublishConfig = function (gitRepoUrl, branch) {
    logger.info('[ops-publish-config-provider.getRemoteOPPublishConfig] fetching' +
                                `'.openpublishing.config.json' from server for repository: ${gitRepoUrl}`);
    return opBuildApiClient.getOPPublishConfig(gitRepoUrl, branch);
}

module.exports.getLocalOPPublishJsonConfig = getLocalOPPublishConfig;
module.exports.getRemoteOPPublishJsonConfig = getRemoteOPPublishConfig;