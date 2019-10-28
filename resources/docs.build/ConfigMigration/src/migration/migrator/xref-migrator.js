/**
 * Migrate xref config in docfx.json into docfx.yml.
 * Source:
 *   docfx.json => xref
 * Only support single docset
 */
'use strict';


const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');

/**
 * Join each xrefFile path configured in docfx.json with docfx.json's current directory
 * @param {*} docfxConfig 
 * @param {*} docsetToPublish 
 */
const migrateSingleDocfxConfig = function (docfxConfig, docsetToPublish) {
    logger.info(`[xref-migrator.migrateSingleDocfxConfig] migrating xref config in docset: ${docsetToPublish.docset_name}`);

    let result = docfxConfig.xref || [];
    return result.map(xrefFilePath => pathUtils.normalize(xrefFilePath));
};

const migrateAllDocfxConfigs = function (docfxConfigs) {
    logger.info('[xref-migrator.migrateAllDocfxConfigs] migrating xref configs: ' +
                        `${Object.entries(docfxConfigs).length} docfx ${Object.entries(docfxConfigs).length > 1 ? 'configs': 'config'} found `);

    // only migrate the first one
    let [[_, config]] = Object.entries(docfxConfigs);
    return migrateSingleDocfxConfig(config.docfxConfig, config.docsetToPublish);
};

module.exports.migrate = migrateAllDocfxConfigs;