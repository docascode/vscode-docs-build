/**
 * Migrate global metadata field.
 * Only works for single docset.
 */
'use strict';

const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');

const PROPERTIES_TO_EXCLUDE = ['contributors_to_exclude', '_op_documentIdPathDepotMapping'];

/**
 * In `docfx.json`'s `globalMetadata`, exclude 'contributors_to_exclude' and '_op_documentIdPathDepotMapping'.
 * In `.openpublishing.publish.config.json`'s `docsetToPublish`: 
 *   "open_to_public_contributors"
 * @param {*} docfxConfig 
 * @param {*} docsetToPublish 
 */
const migrateSingleDocfxConfig = function (docfxConfig, docsetToPublish) {
    logger.info(`[global-metadata-migrator.migrateSingleDocfxConfig] migrating global metadata in docset: ${docsetToPublish.docset_name}`);
    let result = {};
    if (docfxConfig.hasOwnProperty('globalMetadata')) {
        result = Object.entries(docfxConfig.globalMetadata).reduce((acc, [key, value]) => {
            if (!PROPERTIES_TO_EXCLUDE.includes(key)) {
                acc[key] = value;
            }
            return acc;
        }, {});
    }
    // add open_to_public_contributors
    if (!result.hasOwnProperty("open_to_public_contributors")) {
        result.open_to_public_contributors = !!docsetToPublish.open_to_public_contributors;
    }

    // check breadcrumb_path, it should be absolute if added in global metadata
    // change to absolute if not
    if (result.breadcrumb_path && 
        result.breadcrumb_path[0] != '/' && 
        result.breadcrumb_path[0] != '\\' &&
        result.breadcrumb_path[0] != '~') {
        result.breadcrumb_path = pathUtils.normalize(`~/${result.breadcrumb_path}`);
    }

    return result;
};

/**
 * Only support single docset case.
 * Return the global metadata defined in the first `docfx.json`.
 * @param {*} docfxConfigs 
 */
const migrateAllDocfxConfigs = function (docfxConfigs) {
    let config = Object.entries(docfxConfigs)[0][1];
    return migrateSingleDocfxConfig(config.docfxConfig, config.docsetToPublish);
};

module.exports.migrate = migrateAllDocfxConfigs;