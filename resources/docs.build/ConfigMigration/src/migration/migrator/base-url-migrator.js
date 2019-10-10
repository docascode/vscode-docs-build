/**
* Migrate base url.
* Parse from openpublishing site hostName to baseUrl.
* Should prepend "https://" if not starting with
*/
'use strict';

const constants = require('../../../config/config');
const { logger } = require('../../logger');

const migrate = function (hostName, basePath, env) {
    logger.info('[base-url-migrator.migrate] migrating base url property');

    let defaultHostName = constants.HOST_NAME.SANDBOX;
    if (env && env.trim().toLowerCase() === 'prod') {
        defaultHostName = constants.HOST_NAME.PROD;
    }
    hostName = hostName || defaultHostName;
    if (basePath) {
        basePath = basePath == '.' ? '' : basePath;
        basePath = basePath.startsWith('/') ? basePath : `/${basePath}`;
    }
    return `https://${hostName.replace(/(http|https):\/\//i, '')}${basePath ? basePath : ''}`;
}

module.exports.migrate = migrate;