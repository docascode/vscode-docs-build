/**
 * Migrate localizationConfig in docfx v3 config.
 * Based on current building branch, if it's `-sxs` branch, then the bilingual property is true.
 */
'use strict';

/**
 * TODO: only migrate bilingual currently, need to consider mapping type and other properties
 * @param {*} sourceRepoBranch 
 */
const migrate = function (sourceRepoBranch) {
    let bilingual = !!(sourceRepoBranch && sourceRepoBranch.match(/-sxs$/));
    return { bilingual };
};

module.exports.migrate = migrate;