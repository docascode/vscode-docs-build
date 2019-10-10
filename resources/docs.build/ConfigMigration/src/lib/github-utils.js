'use strict';

const hostedGitInfo = require("hosted-git-info");

/**
 * Normalize to github https like url without .git ext suffix.
 * Will return the same string if it's not a github remote.
 * @param {*} gitRemote 
 */
const normalizeGitHubRemote = function (gitRemote) {
    let info = hostedGitInfo.fromUrl(gitRemote);
    if (info && info.type === 'github') {
        return `https://github.com/${info.path()}`;
    }
    return gitRemote;
}

module.exports.normalizeGitHubRemote = normalizeGitHubRemote;