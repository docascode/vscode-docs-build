/**
 * This script can migrate the GitHub user profile cache from the old format to new format.
 *
 * Old format:
 * { "{name}": {"profile_url": "...", "display_name": "...", "name": "{name}", "id": "...", "email_address": "...", "user_emails": "...;...;..." }, ... }
 *
 * New format:
 * { "users": [{ "name"; "...", "login": "...", "id": 0, "emails": ["..."]}, ... ]}
 */
'use strict';

const fs = require('fs');

const fsUtils = require('../../lib/fs-utils');
const { logger } = require('../../logger');

/**
 * Used to transform old model to new model.
 * name(key) + oldModel => newModel
 * @param {*} name 
 * @param {*} oldModel 
 */
const transformSingleUser = function (name, oldModel) {
    // assert
    if (name &&
        oldModel.name &&
        oldModel.id &&
        oldModel.profile_url &&
        oldModel.name.toLowerCase() === name.toLowerCase() &&
        oldModel.profile_url.toLowerCase() === (`https://github.com/${name}`).toLowerCase()) {
        // transform
        const newItem = {
            login: name,
            id: parseInt(oldModel.id, 10),
        };
        if (oldModel.display_name) {
            newItem.name = oldModel.display_name;
        }
        if (oldModel.user_emails) {
            let emails = oldModel.user_emails.split(';').filter(e => e.includes('@'));
            if (emails.length > 0) {
                newItem.emails = emails;   
            }
        }
        return newItem;
    }
    logger.verbose(`[migrate-usercache.main.transform] fail to migrate item with name: ${name}`);
};

const migrateUserCache = function (cmdParams) {
    // read from input file path, load to an old user cache map
    let oldUserCache = JSON.parse(fsUtils.readFileSyncWithAutoEncoding(cmdParams.input));
    // iterate and migrate every single user cache into a new array
    let users = Object.entries(oldUserCache).reduce((newCache, [name, oldModel]) => {
        let newItem = transformSingleUser(name, oldModel);
        newItem && (newCache.push(newItem));
        return newCache;
    }, []);
    // write new user cache array to output file path
    fs.writeFileSync(cmdParams.output, JSON.stringify({ users }));
};

module.exports.transformSingleUser = transformSingleUser;
module.exports.migrateUserCache = migrateUserCache;