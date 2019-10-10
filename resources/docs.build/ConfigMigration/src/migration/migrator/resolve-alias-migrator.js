/**
 * Migrate resolve alias property.
 * Currently only need to map ~ to docset root directory.
 * ONLY support single docset, and it's impossible to produce multiple docsets' output, no way to hack it.
 */
'use strict';

const { logger } = require('../../logger');

/**
 * Map ~ docsetToPublish.build_source_folder.
 * Only treat the first docset.
 * @param {*} docfxConfigs 
 */
const migrate = function (docfxConfigs) {
    logger.info('[resolve-alias-migrator.migrateAllDocfxConfigs] migrating resolveAlias configs: ' +
                        `${Object.entries(docfxConfigs).length} docfx ${Object.entries(docfxConfigs).length > 1 ? 'configs': 'config'} found `);

    // take the first docset by default
    let [_, config] = Object.entries(docfxConfigs)[0];

    return {
        '~': '.'
    }
}

module.exports.migrate = migrate;