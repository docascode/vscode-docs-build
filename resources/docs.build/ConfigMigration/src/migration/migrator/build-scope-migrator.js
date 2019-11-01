/**
 * Migrate the build scope, property content(files & exclude glob patterns).
 */
'use strict';

const path = require('path');

const pathUtils = require('../../lib/path-utils');
const globUtils = require('../../lib/glob-utils');

const {logger} = require('../../logger');

/**
 * warn using {md,yml} as resource file is not supported in docfx v3
 */
const preprocessBuildScopes = function (docfxConfig) {
    // scan resource include scope for warning yml/md files used as resource
    if (Array.isArray(docfxConfig.resource)) {
        docfxConfig.resource.forEach(buildScope => {
            if (Array.isArray(buildScope.files)) {
                buildScope.files.forEach(includePattern => {
                    if (includePattern.endsWith('md') || includePattern.endsWith('yml'))
                        logger.warn(`[build-scope-migrator.migrateSingleDocfxConfig] v3 doesn't support using {md, yml} as resource yet, pattern: ${includePattern}`);
                });
            }
        });
    }
}

/**
 * Iterate through all content & resource in config, and aggregate them to a single object.  
 * Return Example:
 ```json
 {
     "files": ["pattern1", "pattern2", "..." ],
     "exclude": ["pattern1", "pattern2", "..." ]
 }
 ```
 * @param {*} docfxConfig The `docfx.json` file content
 * @param {*} docsetToPublish The `.openpublishing.publish.config.json`'s docsets_to_publish
 */
const migrate = function (docfxConfig) {
    logger.info('[build-scope-migrator.migrate] migrating content & resource config');

    preprocessBuildScopes(docfxConfig);
    let buildScopes = [...(docfxConfig.content || []), ...(docfxConfig.resource || [])];
    let fileGroups = buildScopes.reduce((acc, buildScope) => {
        let src = buildScope.src || '.';
        let files = [],
            exclude = [];
        if (Array.isArray(buildScope.files) && buildScope.files.length > 0) {
            files = buildScope.files.map(globPattern => pathUtils.normalize(path.join(src, globUtils.normalizeGlobPattern(globPattern))));
        }

        if (Array.isArray(buildScope.exclude) && buildScope.exclude.length > 0) {
            exclude = buildScope.exclude.map(globPattern => {
                let result = pathUtils.normalize(path.join(src, globUtils.normalizeGlobPattern(globPattern)));
                if (result == "**" || result == "/**" || result == "../**") {
                    throw new Error(`[build-scope-migrator.migrate] '${globPattern}' in exclude is not allowed, for it's resolved to '**', please remove it from docfx.json`);
                }
                return result;
            });
        }
        if (files.length > 0 || exclude.length > 0) {
            acc.push({files, exclude});
        }
        return acc;
    }, []);
    if (fileGroups.length == 0) {
        return {files: [], exclude: []};
    }
    return fileGroups.length > 1 ? {fileGroups} : fileGroups[0];
}

module.exports.migrate = migrate;