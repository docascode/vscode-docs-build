/**
 * Migrate contribution.
 * Sources: 
 * in `.openpublishing.publish.config.json`: 
 * "git_repository_url_open_to_public_contributors": "https://github.com/Microsoft/azure-docs"
 * "git_repository_branch_open_to_public_contributors": "master"
 * in `docfx.json`:
 *  `globalMetadata.contributors_to_exclude`
 * Only works for single docset.
 */

'use strict';

const {logger} = require('../../logger');

/**
 * 
 * @param {*} docfxConfigs docfx configs map:  
 *   {"docset_name": {"docfxConfig":{}, "docsetToPublish":{}}}
 * @param {*} docsetToPublish 
 */
const extractContributorsToExcludeFromSingleDocset = function (docfxConfig, docsetToPublish) {
    logger.info('[route-migrator.migrateSingleDocfxConfig] extracting excluded contributors in docset: '+
                                `${docsetToPublish.docset_name}`);

    if (docfxConfig.hasOwnProperty('globalMetadata') && docfxConfig.globalMetadata.hasOwnProperty('contributors_to_exclude')) {
        return docfxConfig.globalMetadata.contributors_to_exclude;
    }
    return [];
}

/**
 * Combine the repo info in `.openpublishing.publish.config.json` and deduped excluded contributors in `docfx.json`'s globalMetadata
 * @param {*} OPSPublishConfig 
 * @param {*} docfxConfigs 
 */
const migrate = function (OPSPublishConfig, docfxConfigs, gitRepoUrl, sourceRepoBranch) {
    logger.info('[contribution-migrator.migrateAllDocfxConfigs] migrating contribution configs: ' +
                        `${Object.entries(docfxConfigs).length} docfx ${Object.entries(docfxConfigs).length > 1 ? 'configs': 'config'} found `);
    
    // take the first docset by default
    let config = Object.entries(docfxConfigs)[0][1];

    let contributorsToExclude = extractContributorsToExcludeFromSingleDocset(config.docfxConfig, config.docsetToPublish);

    // always generate repository no matter open_to_public_contributors is true or false
    let contributionConfig = {
        excludedContributors: contributorsToExclude
    }
    let branch = OPSPublishConfig.git_repository_branch_open_to_public_contributors || sourceRepoBranch || '';
    // remove '-sxs' sufix
    branch = branch.replace(/(-sxs)$/, '');
    branch = branch ? `#${branch}` : '';
    let repository = OPSPublishConfig.git_repository_url_open_to_public_contributors || gitRepoUrl;
    contributionConfig.repository = repository ? `${repository}${branch}` : '';
    return contributionConfig;
}

module.exports.migrate = migrate;