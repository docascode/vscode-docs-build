/**
 * Migrate route.
 * build output subfolder is like splitted with dash '-', 'a-b-c' => build to 'a/b/c'
 * 1. in `docfx.json`, `content.src` => `content.dest`
 * 2. in `docfx.json`, `resource.src` => `resource.dest`
 */
'use strict';


const {logger} = require('../../logger');
const pathUtils = require('../../lib/path-utils');

const migrate = function (docfxConfig) {
    logger.info('[route-migrator.migrate] migrating route config');
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

module.exports.migrate = migrate;