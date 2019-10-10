/**
 * Migrate route.
 * build output subfolder is like splitted with dash '-', 'a-b-c' => build to 'a/b/c'
 * 1. in `docfx.json`, `content.src` => `content.dest`
 * 2. in `docfx.json`, `resource.src` => `resource.dest`
 * Support multiple docset.
 */
'use strict';

const path = require('path');

const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');


/**
 * Return all route configs in one docset.  
 * Consisting of: 
 *  - in `docfx.json`, `content.src` => `content.dest`
 *  - in `docfx.json`, `resource.src` => `resource.dest`
 * @param {*} docfxConfig 
 * @param {*} docsetToPublish 
 */
const migrateSingleDocfxConfig = function (docfxConfig, docsetToPublish) {
    logger.info(`[route-migrator.migrateSingleDocfxConfig] migrating route config in docset: ${docsetToPublish.docset_name}`);

    let result = {};

    // gather content & resource route source, content route overwrites resource route
    let routeSrc = (docfxConfig.resource || []).concat(docfxConfig.content || []);

    let routes = routeSrc.reduce((routes, route) => {
        if (route.src || route.dest) {
            let src = pathUtils.normalizeFolder(route.src || '.');
            let dest = pathUtils.normalizeFolder(route.dest || '.');
            dest = dest === '/' ? '.' : dest;
            routes.push({src, dest});
        }
        return routes;
    }, []);
    // sort by folder depth
    routes.sort((routeA, routeB) => pathUtils.sort(routeA.src, routeB.src));
    routes.forEach(({src, dest}) => {
        if (result.hasOwnProperty(src) && result[src] != dest) {
            throw new Error(`[route-migrator.migrateSingleDocfxConfig] duplicate route: ${src} -> ${result[src]} | ${src} -> ${dest}`);
        }
        result[src] = dest;
    });
    return result;
}

/**
 * Return merged all route configs in all docsets.
 *  - in `docfx.json`, `content.src` => `content.dest`
 *  - in `docfx.json`, `resource.src` => `resource.dest`
 * 
 * Return Example:
 ```json
    {
        "source/": "dest/",
        "articles/": "azure/"
    }
 ```
 * @param {*} docfxConfigs 
 */
const migrateAllDocfxConfigs = function (docfxConfigs) {
    logger.info('[route-migrator.migrateAllDocfxConfigs] migrating route configs: ' +
                        `${Object.entries(docfxConfigs).length} docfx ${Object.entries(docfxConfigs).length > 1 ? 'configs': 'config'} found `);
    
    // only migrate the first one
    let allRouteConfigs =  Object.entries(docfxConfigs).map(([docsetName, config]) =>
    migrateSingleDocfxConfig(config.docfxConfig, config.docsetToPublish));

    // merge all route configs into one map
    return allRouteConfigs.reduce((acc, routeConfig, idx) => {
        if (idx > 0) {
            Object.entries(routeConfig).forEach(([src, dest]) => {
                if (!acc.hasOwnProperty(src)) {
                    acc[src] = dest;
                } else {
                    logger.error(`[route-migrator.migrateAllDocfxConfigs] duplicate route config source: ${src}`);
                }
            })
        }
        return acc;
    }, allRouteConfigs[0]);
}

module.exports.migrate = migrateAllDocfxConfigs;