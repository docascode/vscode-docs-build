/**
 * Provide repo's docsets info.
 */
'use strict';

const { logger } = require('../logger');
const opBuildApiClient = require('../lib/op-build-api-client');

const getDocsetsInfo = async function ({repository, defaultDocsetName, basePath, productName, opBuildUserToken, env} = {} ) {
    logger.info(`[docset-info-provider.getDocsetsInfo] generating docsets info`);
    // if it's passed from command line, then pack it directly 
    if (basePath && 
        typeof(basePath) === 'string' &&
        productName &&
        typeof(productName) === 'string') {
        return [
            {
                name: defaultDocsetName,
                base_path: basePath,
                product_name: productName
            }
        ]
    }
    // set remote
    opBuildApiClient.initialize(opBuildUserToken, env);

    // otherwise, the product_name, base_path can ONLY be retrieved from this API
    return await opBuildApiClient.getDocSets(repository);
};

module.exports.getDocsetsInfo = getDocsetsInfo;