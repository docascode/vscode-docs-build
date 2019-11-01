/**
 * Migrate xref config in docfx.json into docfx.yml.
 * Source:
 *   docfx.json => xref
 */
'use strict';


const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');

/**
 * Join each xrefFile path configured in docfx.json with docfx.json's current directory
 * @param {*} docfxConfig 
 */
const migrate = function (docfxConfig) {
    logger.info('[xref-migrator.migrateSingleDocfxConfig] migrating xref config');

    let result = docfxConfig.xref || [];
    return result.map(xrefFilePath => pathUtils.normalize(xrefFilePath));
};

module.exports.migrate = migrate;