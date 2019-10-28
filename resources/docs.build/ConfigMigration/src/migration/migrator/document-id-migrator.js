/**
 * Migrate document id field.
 * Only works for single docset.
 */
'use strict';

const {logger} = require('../../logger');


/**
 * In `docfx.json`'s `_op_documentIdPathDepotMapping`
 * @param {*} docfxConfig 
 * @param {*} docsetToPublish 
 */
const migrateSingleDocfxConfig = function (docfxConfig, docsetToPublish) {
    logger.info(`[document-id-migrator.migrateSingleDocfxConfig] migrating route config in docset: ${docsetToPublish.docset_name}`);
    
    let defaultDocumentId = {
        depotMappings: {}, 
        directoryMappings: {}
    }
    return (docfxConfig.hasOwnProperty('globalMetadata') && docfxConfig.globalMetadata.hasOwnProperty('_op_documentIdPathDepotMapping')) ? 
        Object.entries(docfxConfig.globalMetadata._op_documentIdPathDepotMapping).reduce((acc, [sourcePath, values]) => {
            if (values.hasOwnProperty('depot_name')) {
                acc.depotMappings[sourcePath] = values.depot_name;
            }
            acc.directoryMappings[sourcePath] = values.folder_relative_path_in_docset;
            return acc;
        }, defaultDocumentId) : defaultDocumentId;
};

const migrateAllDocfxConfigs = function (docfxConfigs) {
    let config = Object.entries(docfxConfigs)[0][1];
    return migrateSingleDocfxConfig(config.docfxConfig, config.docsetToPublish, config.docsetInfo);

}

module.exports.migrate = migrateAllDocfxConfigs;