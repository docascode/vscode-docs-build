/**
 * Provide local/remote docfx json configuration.
 */
'use strict';

const path = require('path');
const fs = require('fs');

const constants = require('../../config/config');
const fsUtils = require('../lib/fs-utils');
const {logger} = require('../logger');
const opBuildApiClient  = require('../lib/op-build-api-client');

/**
 * Load one local `docfx.json` in given file
 * @param {*} dir The directory that contain's a `docfx.json` file
 */
let getLocalDocfxConfig = async function (dir) {
    logger.info(`[docfx-json-provider.getLocalDocfxConfig] loading local \`docfx.json\` in ${dir}`);
    let promise = new Promise((resolve, reject) => {
        try {
            let content = fsUtils.readFileSyncWithAutoEncoding(path.join(dir, constants.DOCFX_JSON_CONFIG_FILENAME));
            resolve(JSON.parse(content));
        } catch (error) {
            logger.error(constants.ERROR_MSG.JSON_SYNTAX_ERROR, {
                code: 'invalid-json-syntax',
                type: 'User',
                file: constants.DOCFX_JSON_CONFIG_FILENAME
            });
            reject(error);
        }
    })
    return promise;
}

/**
 * Load all local `docfx.json` defined in `.openpublishing.publish.config.json`'s `docsets_to_publish`,  
 * return a map of the configs & docsetToPublish.  
 * Return Sample:
 ```json
 {
     "docset_name_1": {
        "build": {}, // the `docfx.json` file, `build` is making local config schema the same as API returned schema
     }
 }
 ```
 * @param {*} dir The repository directory
 * @param {*} docsetsToPublish `.openpublishing.publish.config.json`'s `docsets_to_publish` property
 */
const getAllLocalDocfxConfigs = async function (dir, docsetsToPublish) {
    logger.info('[docfx-json-provider.getAllLocalDocfxConfigs] loading all local `docfx.json`');
    let promises = docsetsToPublish.map(docsetToPublish => 
                                            getLocalDocfxConfig(path.join(dir, docsetToPublish.build_source_folder)));
    let docfxConfigs = await Promise.all(promises);
    return docfxConfigs.reduce((acc, docfxConfig, idx) => {
        acc[docsetsToPublish[idx].docset_name] = docfxConfig;
        return acc;
    }, {});
}

/**
 * @deprecated, since docfx.json is now always loaded from local file, this function shouldn't be used.
 * @param {*} gitRepoUrl 
 * @param {*} branch 
 */
const getAllRemoteDocfxConfigs = function (gitRepoUrl, branch) {
    logger.info('[docfx-json-provider.getAllRemoteDocfxConfigs] fetching' +
                                `'.openpublishing.config.json' from server for repository: ${gitRepoUrl}`);
    return opBuildApiClient.getDocfxConfigs(gitRepoUrl, branch);
}

module.exports.getAllLocalDocfxConfigs = getAllLocalDocfxConfigs;
module.exports.getAllRemoteDocfxConfigs = getAllRemoteDocfxConfigs;