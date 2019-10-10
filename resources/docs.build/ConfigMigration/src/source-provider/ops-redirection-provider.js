/**
 * Provide local redirection configurations.  
 * Note: Currently this file only exists in the repository directly, i.e. no API can provide it yet.
 */
'use strict';

const path = require('path');
const fs = require('fs');

const constants = require('../../config/config');
const fsUtils = require('../lib/fs-utils');
const {logger} = require('../logger');

/**
 * Load local `.openpublishing.redirections.json`. Return empty array if file doesn't exist.  
 * Return Example:
```json
    [
        {
            "source_path": "articles/batch/batch-dotnet-get-started.md",
            "redirect_url": "/azure/batch/quick-run-dotnet",
            "redirect_document_id": true
        }, 
        {}
    ]
```
 * @param {*} dir 
 */
const getOPRedirections = function (dir) {
    let promise = new Promise((resolve, reject) => {
        let redirectionFilePath = path.join(dir, constants.OP_PUBLISH_REDIRECTION_FILENAME);
        fs.exists(redirectionFilePath, exists => {
            if (exists) {
                let content = fsUtils.readFileSyncWithAutoEncoding(redirectionFilePath);
                try {
                    resolve(JSON.parse(content));
                } catch (error) {
                    logger.error(constants.ERROR_MSG.JSON_SYNTAX_ERROR, {
                        code: 'invalid-json-syntax',
                        type: 'User',
                        file: constants.OP_PUBLISH_REDIRECTION_FILENAME
                    });
                    reject(error);
                }
            } else {
                logger.info('[ops-redirection-provider.getOPRedirections]: no redirection file found');
                resolve({redirections: []});
            }
        });
    })
    return promise;
}

module.exports.getOPRedirections = getOPRedirections;