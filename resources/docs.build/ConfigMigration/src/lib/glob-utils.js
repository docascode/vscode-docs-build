'use strict';

const glob = require('glob');

/**
 * Normalize a glob pattern string. 
 * `****` => `**`
 * `.**` => `.*`
 * `**.` => `*.`
 * @param {string} globPattern 
 */
const normalizeGlobPattern = function (globPattern) {
    if (!globPattern) {
        return globPattern;
    }
    // **** => **
    globPattern = globPattern.replace(/\*{2,}/g, '**');
    // **.[A-Za-z0-9]
    globPattern = globPattern.replace(/\*{2}\.(?=[A-Za-z0-9])/g, '**/*.');
    // **.* => **
    globPattern = globPattern.replace(/\*{2}\.\*+/g, '**');
    // **(/**)+ => /**
    globPattern = globPattern.replace(/\*{2}(\/\*{2})+/g, '**');
    // **. => *.
    globPattern = globPattern.replace(/\*+\./g, '*.');
    // .** => .*
    globPattern = globPattern.replace(/\.\*+/g, '.*');

    return globPattern;
}

/**
 * Return all markdown files in given directory.
 * @param {*} directory 
 */
const getAllMarkDownFiles = function (directory) {
    return glob.sync(
        '**/*.md', {
            cwd: directory,
            dot: true,
            absolute: true,
            nodir: true
        });
}

module.exports.normalizeGlobPattern = normalizeGlobPattern;
module.exports.getAllMarkDownFiles = getAllMarkDownFiles;