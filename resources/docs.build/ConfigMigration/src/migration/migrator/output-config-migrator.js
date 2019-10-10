/**
 * Migrate the build scope, property content(include, exclude).
 */
'use strict';

const {logger} = require('../../logger');

/**
 * In `.openpublishgn`
 * @param {*} OPSPublishConfig 
 */
const migrate = function (OPSPublishConfig) {
    logger.info('[output-config-migrator.migrate] migrating output config');

    return {
        pdf: !!OPSPublishConfig.need_generate_pdf_url_template,
        copyResources: false
    }
}

module.exports.migrate = migrate;