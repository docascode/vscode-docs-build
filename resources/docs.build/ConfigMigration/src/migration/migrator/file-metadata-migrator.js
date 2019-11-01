/**
 * Migrate global metadata field.
 */
'use strict';

const path = require('path');
const globUtils = require('../../lib/glob-utils');

const {logger} = require('../../logger');

/**
 * In `docfx.json`'s `fileMetadata`.
 * Return {docsetToPublish.build_source_folder}/{glob_pattern}
 * @param {*} docfxConfig 
 */
const migrate = function (docfxConfig) {
    logger.info('[file-metadata-migrator.migrateSingleDocfxConfig] migrating file metadata');

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

module.exports.migrate = migrate;