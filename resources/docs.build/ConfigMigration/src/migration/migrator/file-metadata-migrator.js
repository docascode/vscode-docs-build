/**
 * Migrate global metadata field.
 * Only works for single docset.
 */
'use strict';

const path = require('path');
const pathUtils = require('../../lib/path-utils');
const globUtils = require('../../lib/glob-utils');

const {logger} = require('../../logger');

/**
 * In `docfx.json`'s `fileMetadata`.
 * Return {docsetToPublish.build_source_folder}/{glob_pattern}
 * @param {*} docfxConfig 
 * @param {*} docsetToPublish 
 */
const migrateSingleDocfxConfig = function (docfxConfig, docsetToPublish) {
    logger.info(`[file-metadata-migrator.migrateSingleDocfxConfig] migrating file metadata in docset: ${docsetToPublish.docset_name}`);

    let result = {};
    if (docfxConfig.hasOwnProperty('fileMetadata')) {
        let fileMetadata = docfxConfig.fileMetadata;
        //https://dev.azure.com/ceapex/Engineering/_workitems/edit/124513
        if (fileMetadata.hasOwnProperty('titleOverwriteH1')) {
            delete Object.assign(fileMetadata, {title: fileMetadata.titleOverwriteH1}).titleOverwriteH1;
        }
        result = Object.entries(fileMetadata).reduce((acc, [key, globValueMap]) => {
            Object.entries(globValueMap).forEach(([glob, value]) => {
                glob = path.normalize(globUtils.normalizeGlobPattern(glob)).replace(/\\/g, '/');
                glob = glob[0] === '/' ? glob.substr(1) : glob;
                if (!acc.hasOwnProperty(key)) {
                    acc[key] = {};
                }
                acc[key][glob] = value;
            });
            return acc;
        }, {});
    }
    return result;
}

/**
 * Only support single docset case.
 * Return the file metadata defined in the first `docfx.json`.
 * @param {*} docfxConfigs 
 */
const migrateAllDocfxConfigs = function (docfxConfigs) {
    let config = Object.entries(docfxConfigs)[0][1];
    return migrateSingleDocfxConfig(config.docfxConfig, config.docsetToPublish);

}

module.exports.migrate = migrateAllDocfxConfigs;