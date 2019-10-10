'use strict';

const path = require('path');

/**
 * Return normalized folder path, always ends with '/'.
 * @param {*} folder 
 */
const normalizeFolder = function (folder) {
    if (!folder || folder === '.') {
        return '/';
    }
    folder = path.normalize(folder).replace(/\\/g, '/');
    if (folder === './') {
        return '/';
    }
    if (folder[folder.length - 1] !== '/') {
        folder += '/';
    }
    if (folder[0] === '/') {
        return folder.substr(1);
    }
    return folder;
};

const normalize = function (filePath) {
    filePath = path.normalize(filePath).replace(/\\/g, '/');
    return filePath;
};

const sort = function (pathA, pathB) {
    if (!pathA) {
        return -1;
    }
    if (!pathB) {
        return 1;
    }
    let result = pathA.split('/').length - pathB.split('/').length;
    if (result == 0) {
        result = pathA.localeCompare(pathB);
    }
    return result;
}

module.exports.normalizeFolder = normalizeFolder;
module.exports.normalize = normalize;
module.exports.sort = sort;