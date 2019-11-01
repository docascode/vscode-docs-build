/**
 * Migrate monikerRange.
 * Using below resources:
 * 1. `docfx.json`'s content src, files and group
 * 2. `docfx.json`'s groups
 * {docsetFolder}/{content.src}(means a glob pattern) => monikerRange string
 */
'use strict';

const path = require('path');

const globUtils = require('../../lib/glob-utils');
const pathUtils = require('../../lib/path-utils');
const { logger } = require('../../logger');

const migrate = function (docfxConfig) {
    logger.info('[moniker-range-migrator.migrate] migrating monikerRange');

    let scopes = [].concat(docfxConfig.content || []).concat(docfxConfig.resource || []);
    let monikerRoutes = scopes.reduce((monikerRoutes, item) => {
        // generate monikers when content has defined group
        if (item.hasOwnProperty('group') && docfxConfig.hasOwnProperty('groups') && docfxConfig.groups.hasOwnProperty(item.group)) {
            let src = item.src || '.';
            // iterate through content.files to generate globs 
            if (Array.isArray(item.files) && item.files.length > 0) {
                item.files.forEach(globPattern => {
                    if (globPattern && globPattern.indexOf('*') > -1) {
                        monikerRoutes.paths.push({
                            src: pathUtils.normalize(path.join(src, globUtils.normalizeGlobPattern(globPattern))),
                            monikerRange: docfxConfig.groups[item.group].moniker_range
                        });
                    } else {
                        monikerRoutes.files.push({
                            src: pathUtils.normalize(path.join(src, globUtils.normalizeGlobPattern(globPattern))),
                            monikerRange: docfxConfig.groups[item.group].moniker_range
                        });
                    }
                });
            }
        }
        return monikerRoutes;
    }, {paths:[], files:[]});

    monikerRoutes.paths.sort((routeA, routeB) => pathUtils.sort(routeA.src, routeB.src));
    monikerRoutes.files.sort((routeA, routeB) => pathUtils.sort(routeA.src, routeB.src));
    let result = monikerRoutes.paths.reduce((result, {src, monikerRange}) => {
        result[src] = monikerRange;
        return result;
    }, {});
    monikerRoutes.files.forEach(({src, monikerRange}) => result[src] = monikerRange);
    return result;
}

module.exports.migrate = migrate;