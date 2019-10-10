/**
 * Migrate redirection.
 */
'use strict';

const path = require('path');

const glob = require('glob');

const { logger } = require('../../logger');
const markdownUtils = require('../../lib/markdown-utils');
const pathUtils = require('../../lib/path-utils');

// enable extended methods
require('../../lib/custom-extend');

const localePath = '(\/[A-Za-z]{2}(-[A-Za-z]{2,4}){1,2})?';

let regexRemoveMatchers = [];

/**
 * Apply regex rules to the redirectUrl(redirect-to).
 *   - remove all "https://docs.microsoft.com"
 * @param {*} redirectUrl url to modify
 * @param {*} sourcePath for reporting
 */
const transformRedirectUrl = function (redirectUrl, sourcePath) {
    if (!redirectUrl) {
        logger.warn(`[redirection-migrator.transformRedirectUrl] empty redirectUrl for source_path: ${sourcePath}`);
        return redirectUrl;
    }
    regexRemoveMatchers.forEach(regex => {
        redirectUrl = redirectUrl.replace(regex, '');
    });
    return redirectUrl;
}

/**
 * Normalize redirect from.
 *   - extension .yml => .md
 * @param {*} redirectFrom 
 */
const normalizeSourcePath = function (sourcePath, docsetPath) {
    sourcePath = pathUtils
                 .normalize(path.relative(docsetPath || '.', sourcePath))
                 .replace(/\.yml$/i, '.md');
    
    return sourcePath;
}

const initializeRegexRemoveMatchers = function (hostNamesToRemove) {
    if (Array.isArray(hostNamesToRemove)) {
        regexRemoveMatchers = hostNamesToRemove.map(
            (hostName) => {
                if (hostName) {
                    // remove http, https prefix
                    hostName = hostName.replace(/(http|https):\/\//i, '');
                    return new RegExp((`^(?:(https|http)://)?${hostName}`).replace(/\.|\//g, '\\$&') + localePath, 'ig');
                }
            }
        );
    }
}

/**
 * Check the redirection item and add it to allRedirections
 * @param {*} allRedirections 
 */
let addRedirection = function (allRedirections, redirectionItem, docsetPath = '.') {
    let redirectUrl = redirectionItem.getPropertyCaseInsensitive('redirect_url');
    let sourcePath = redirectionItem.getPropertyCaseInsensitive('source_path');
    
    // ignore the redirection if it doesn't belong to current docset
    if (docsetPath !== '.' && !sourcePath.startsWith(docsetPath))
        return;
    sourcePath = normalizeSourcePath(sourcePath, docsetPath);
    let redirectWithId = redirectionItem.getPropertyCaseInsensitive('redirect_document_id');
    if (redirectWithId && (redirectWithId === true || redirectWithId === "true")) {
        let transformedRedirectUrl = transformRedirectUrl(redirectUrl, sourcePath);
        // only put redirection with redirectTo starting with 'http' to without_document_id
        if (transformedRedirectUrl.startsWith("http")) {
            allRedirections.redirectionsWithoutId[sourcePath] = transformedRedirectUrl;
        } else {
            allRedirections.redirections[sourcePath] = transformedRedirectUrl;
        }
    } else {
        allRedirections.redirectionsWithoutId[sourcePath] = transformRedirectUrl(redirectUrl, sourcePath);
    }
}



/**
 * Load redirections defined in redirection file.
 * @param {*} redirections 
 * @param {String[]} hostNamesToRemove
 */
const loadFromRawRedirectionFile = function (redirections, hostNamesToRemove, docsetPath) {
    logger.info('[redirection-migrator.loadFromRedirections] loading redirections from .openpublishing.redirection.json');
    initializeRegexRemoveMatchers(hostNamesToRemove);
    return redirections.reduce((acc, redirection) => {
        addRedirection(acc, redirection, docsetPath);
        return acc;
    }, {
        redirections: {},
        redirectionsWithoutId: {}
    });
}

/**
 * Load redirections defined in yaml header metadata.
 * Return parsed redirections.
 * @param {string} repositoryDir : the repository base directory
 * @param {*} globPatterns 
 */
const loadFromGlobbedFilesMetadata = function (repositoryDir, globPatterns, hostNamesToRemove) {
    logger.info('[redirection-migrator.loadFromGlobbedFiles] loading redirections from globbed files');

    initializeRegexRemoveMatchers(hostNamesToRemove);
    
    // glob file list
    // options reference: https://github.com/isaacs/node-glob#options
    let filePaths = glob.sync(
        '**/*.md', {
            cwd: repositoryDir,
            dot: true,
            nodir: true,
            ignore: globPatterns ? globPatterns.excludes : null
        });

    // filter out only *.md and toc
    // TODO: 1. delete files with redirections 
    //       2. optimize using multithreading
    let allFileMetadata = filePaths.reduce((acc, filePath) => {
        try {
            let parsedFileObj = markdownUtils.readMetadata(path.join(repositoryDir, filePath));
            if (parsedFileObj.getPropertyCaseInsensitive('redirect_url')) {
                addRedirection(acc, Object.assign(parsedFileObj,{ source_path: filePath }));
            }
        } catch (err) {
            logger.warn(`[redirection-migrator.loadFromGlobbedFiles] extract yaml header metadata failed: ${filePath}`);
        }

        return acc;
    }, {
        redirections: {},
        redirectionsWithoutId: {}
    });
    return allFileMetadata;
}

/**
 * Parse the redirections rules, merge with redirections defined in file metadata,
 * and then divide into with/withoutId parts. 
 * Return a redirection object and new files to exclude(which are the files that have redirect_url as metadata).
 * Return Example:  
 ```json
 {
     redirection: {
        "redirections": {
            "source_path": "redirect_url",
            "...": "..."
        },
        "redirectionWithoutId": {
            "source_path": "redirect_url",
            "...": "..."
        }
     },
     exclude: []
 }
 ```
 * @param {*} redirections `.openpublishing.redirections.json`'s redirections property 
 * @param {*} repositoryDir 
 * @param {*} globPatterns 
 * @param {*} scanRedirection 
 */
const migrate = function (redirections, repositoryDir, globPatterns, scanRedirection, hostNamesToRemove, docsetPath) {
    logger.info('[redirection-migrator.migrate] migrating redirections config');

    initializeRegexRemoveMatchers(hostNamesToRemove);

    // redirections defined in .openpublishing.redirections.json file
    let rawRedirections = loadFromRawRedirectionFile(redirections, hostNamesToRemove, docsetPath);

    let exclude = [];
    let fileRedirections = {
        redirections: {},
        redirectionsWithoutId: {}
    };
    if (scanRedirection) {
        // redirections defined in yaml header metadata
        fileRedirections = loadFromGlobbedFilesMetadata(repositoryDir, globPatterns);

        exclude = Object.keys(fileRedirections.redirections).concat(
            Object.keys(fileRedirections.redirectionsWithoutId));
    }

    return {
        redirection: {
            // merge rawRedirection into file-metadata redirection has lower priority than redirection file
            redirections: Object.assign(fileRedirections.redirections, rawRedirections.redirections),
            redirectionsWithoutId: Object.assign(fileRedirections.redirectionsWithoutId, rawRedirections.redirectionsWithoutId)
        },
        exclude: exclude
    };
}


module.exports.migrate = migrate;
module.exports.loadFromRawRedirectionFile = loadFromRawRedirectionFile;
module.exports.loadFromGlobbedFilesMetadata = loadFromGlobbedFilesMetadata;