/**
 * Migrate document id field.
 */
'use strict';

const {logger} = require('../../logger');


/**
 * In `docfx.json`'s `_op_documentIdPathDepotMapping`
 * @param {*} docfxConfig 
 * @param {*} docsetToPublish 
 */
const migrate = function (docfxConfig) {
    logger.info('[document-id-migrator.migrateSingleDocfxConfig] migrating route config');
    
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

}

module.exports.migrate = migrate;