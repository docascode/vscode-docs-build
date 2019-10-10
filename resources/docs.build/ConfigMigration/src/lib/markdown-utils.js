'use strict';

const fs = require('fs');

const yaml = require('js-yaml');

const fsUtils = require('./fs-utils');

/**
 * Read from markdown file metadata, return parsed object, including metadata properties and __content.
 * @param {*} filePath : The markdown file path
 */
const readMetadata = function (filePath) {
    let lines = fsUtils.readFileSyncWithAutoEncoding(filePath).split('\n');
    let yamlHeaderEnd = extractYamlHeader(lines);
    if (yamlHeaderEnd < 1) {
        // empty yaml header
        return {};
    }
    let yamlHeaderLines = lines.slice(1, yamlHeaderEnd);
    try {
        let yamlHeaderObj = yaml.safeLoad(yamlHeaderLines.join('\n'));
        return yamlHeaderObj;
    } catch (_) {
        return {};
    }
}

/**
 * Return end of yaml header.
 * First line must be '---'
 */
/**
 * Returns index of yaml header end
 * @param {*} lines string of each line
 */
const extractYamlHeader = function (lines) {
    if (lines[0] && lines[0].trim() !== '---') {
        return -1;
    }
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
            return i;
        }
    }
}

module.exports.readMetadata = readMetadata;
module.exports.extractYamlHeader = extractYamlHeader;