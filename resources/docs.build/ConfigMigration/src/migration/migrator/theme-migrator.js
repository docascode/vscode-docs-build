/**
* Migrate theme.
* in `.openpublishing.publish.config.json`'s dependent_repositories
*/
'use strict';

const {logger} = require('../../logger');
const dependencyMigrator = require('./dependency-migrator')

/**
* Iterate through `.openpublishing.publish.config.json`'s dependent_repositories, return the first element whose path_to_root equals `_theme`
* Rule: 
*   1. branch_mapping has source repo branch name, use applied branch name
*   2. use theme repo defined branch name
* Return Example: 
```json
{
    "dependent_alias": "https://github.com/Azure/azure-docs-powershell#certain-branch"
}
```
* @param {*} dependentRepositories 
*/
const migrate = function (dependentRepositories, sourceRepoBranch) {
    logger.info('[theme-migrator.migrate] migrating theme property');
    let themeRepository = dependentRepositories.find(dependentRepository => dependentRepository.path_to_root === '_themes');
    if (!themeRepository) {
        return '';
    }
    let mappedBranch = dependencyMigrator.mapDependentBranch(themeRepository, sourceRepoBranch);
    return `${themeRepository.url}${mappedBranch ? `#${mappedBranch}` : ''}`;
}

module.exports.migrate = migrate;