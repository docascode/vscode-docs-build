/**
* Migrate dependencies.
* in `.openpublishing.publish.config.json`'s dependent_repositories
*/
'use strict';

const path = require('path');

const constants = require('../../../config/config');
const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');

/**
* Iterate through `.openpublishing.publish.config.json`'s dependent_repositories and return a dependency map.
* Return Example: 
```json
{
    "dependent_alias": "https://github.com/Azure/azure-docs-powershell#certain-branch"
}
```
* @param {*} dependentRepositories 
*/
const migrate = function (dependentRepositories, sourceRepoBranch, docsetToPublish) {
    logger.info('[dependency-migrator.migrate] migrating dependent repositories, ' +
    `${dependentRepositories.length} ${dependentRepositories.length > 1 ? 'dependencies' : 'dependency'} found`);

    let pathToRepoRoot = pathUtils.normalizeFolder(docsetToPublish.build_source_folder).split('/').filter(path => path).map(_ => '..').join('/');
    let result = dependentRepositories.reduce((acc, dependentRepository) => {
        // exclude DEPENDENCY_TO_EXCLUDE
        if (!constants.DEPENDENCY_TO_EXCLUDE.includes(dependentRepository.path_to_root)) {
            let pathToDocsetRoot = pathUtils.normalize(path.join(pathToRepoRoot, dependentRepository.path_to_root));
            if (dependentRepository.include_in_build 
                && (dependentRepository.include_in_build === true || dependentRepository.include_in_build.toLowerCase() === 'true')) {
                acc[pathToDocsetRoot] = {
                    url: `${dependentRepository.url}${mapDependentBranch(dependentRepository, sourceRepoBranch)}`,
                    includeInBuild: true
                };
            } else {
                acc[pathToDocsetRoot] = `${dependentRepository.url}${mapDependentBranch(dependentRepository, sourceRepoBranch)}`;
            }
        }
        return acc;
    }, {});
    return result;
}

/**
 * Return #{branchName} when branch isn't null, otherwise return empty string
 * @param {*} dependencyItem the dependency item in v2 redirections file format
 * @param {*} sourceRepoBranch current building(migrating) branch
 */
const mapDependentBranch = function (dependentRepository, sourceRepoBranch) {
    if (sourceRepoBranch &&
        dependentRepository.hasOwnProperty('branch_mapping') &&
        dependentRepository.branch_mapping.hasOwnProperty(sourceRepoBranch)) {
            sourceRepoBranch = dependentRepository.branch_mapping[sourceRepoBranch];
    } else {
        sourceRepoBranch = dependentRepository.branch;
    }
    return !sourceRepoBranch ? '' : '#' + sourceRepoBranch;
}

module.exports.migrate = migrate;
module.exports.mapDependentBranch = mapDependentBranch;