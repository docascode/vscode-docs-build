/**
 * Migrate global metadata field.
 */
'use strict';

const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');

const PROPERTIES_TO_EXCLUDE = ['contributors_to_exclude', '_op_documentIdPathDepotMapping'];


const migrate = function (docfxConfig, docsetToPublish) {
    logger.info('[global-metadata-migrator.migrateSingleDocfxConfig] migrating global metadata');
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

module.exports.migrate = migrate;