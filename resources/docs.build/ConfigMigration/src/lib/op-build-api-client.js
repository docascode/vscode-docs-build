/**
 * Fetch resource information from ops api server
 */

const request = require('request');
const querystring = require('querystring');
const format = require('string-format');

const { logger } = require('../logger');
const constants = require('../../config/config');

const OPS_API = {
    /**
     * GET: Repo information, including repo id and its dependencies
     * Require:
     *  params:
     *      git_repo_url: the git hub url
     *  header:
     *      X-OP-BuildUserToken
     */
    REPO_INFO: '/v2/Repositories',
    /**
     * GET: docfx json configuration, should be same as the one(docfx.json) in git worktree, except that the key name 'build' => 'real-name'.
     *      including all docsets in the repo, return in the form of dictionary {"repo-name": "docfx-config"}
     * Require:
     *  url params:
     *      git_repo_url: the git hub url
     *      branch: target branch
     *  header:
     *      X-OP-BuildUserToken
     */
    DOCFX_CONFIG: '/v1/Configurations/docfx',
    /**
     * GET: all docsets in a repo, including docset id, brief information(e.g. product_name, name) and parent repo id  
     * Require:
     *  url params: 
     *      git_repo_url: the git hub url
     *      docset_query_status('Created' by default)
     *  header:
     *      X-OP-BuildUserToken
     */
    DOCSETS: '/v2/Queries/Docsets',
    /**
     * GET: detail info of a specific docset, it's similar with `REPO_INFO` or `DOCSETS`, so this API may not be useful.
     * Require:
     *  path params:
     *      repositoryId: guid, need query firstly from DOCSETS
     *      docsetId: guid, need query firstly from DOCSETS
     *  header:
     *      X-OP-BuildUserToken
     */
    DOCSET_DETAIL: '/v2/Repositories/{repositoryId}/Docsets/{docsetId}',
    /**
     * GET: openpublishing publish json configuration, should be same as the one(.openpublishing.publish.config.json) in git worktree
     * Require:
     *  url params:
     *      git_repo_url: the git hub url
     *      branch: target branch
     *  header:
     *      X-OP-BuildUserToken
     */
    OPS_PUBLISH_CONFIGURATION: '/v1/Configurations',
    /**
     * POST: Create a build manually in Open Publishing Build
     * Require:
     *  url params:
     *      repositoryId: The repository id
     *  header:
     *      X-OP-BuildUserToken
     *  body:
     *      branch: branch to build
     *      force_publish: force a full publish
     *      target: Publish/PDF
     */
    BUILD: '/v1/Repositories/{repositoryId}/Builds',
    /**
     * GET: Get a build metadata with specified build id
     * Require:
     *  url params:
     *      repositoryId: The repository id
     *      buildId: The build id
     *  header:
     *      X-OP-BuildUserToken
     */
    BUILD_INFO: '/v1/Repositories/{repositoryId}/Builds/{buildId}',
    /**
     * GET: Get a repository in Open Publishing Build by repository id
     * Require:
     *  url params:
     *      repositoryId: The repository id
     *  header:
     *      X-OP-BuildUserToken
     */
    REPOSITORY: '/v1/Repositories/{repositoryId}',
    /**
     * GET: Get paged builds of authenticated user
     * Require:
     *  url params:
     *      start: The utc start time to filter, format is yyyymmddhhmmss
     *      end: The utc end time to filter, format is yyyymmddhhmmss
     *      repository: The repository id to filter
     *      branch: The branch to filter
     *      target: The build target to filter
     *      count: The query count(0<count<101), default is 2
     *  header:
     *      X-OP-BuildUserToken
     */
    QUERY_BUILDS: '/v2/Queries/Builds'
}

const initialize = function (xOPBuildUserToken, env) {
    _opBuildBaseUrl = constants.OP_BUILD_BASE_URL.SANDBOX;
    if (env) {
        switch (env.trim().toLowerCase()) {
            case 'prod':
                _opBuildBaseUrl = constants.OP_BUILD_BASE_URL.PROD;
                break;
            case 'perf':
                _opBuildBaseUrl = constants.OP_BUILD_BASE_URL.PERF;
                break;
            case 'internal':
                _opBuildBaseUrl = constants.OP_BUILD_BASE_URL.INTERNAL;
                break;
        }
    }

    // initialize user token
    _xOPBuildUserToken = xOPBuildUserToken || process.env.xOPBuildUserToken;
}

const getRepositoryByUrl = async function (gitRepoUrl) {
    let requestUrl = `${_opBuildBaseUrl}${OPS_API.REPO_INFO}` +
        `?${querystring.stringify({
            git_repo_url: gitRepoUrl
        })}`;
    logger.info(`[ops-server-resource-provider.getRepoInfoByUrl] Get ${requestUrl}`);

    return sendRequest(requestUrl, 'GET');
}

const getRepositoryById = function (repositoryId) {
    let requestUrl = `${_opBuildBaseUrl}${OPS_API.REPOSITORY}` +
        `?${querystring.stringify({
            repositoryId: repositoryId
        })}`;

    logger.info(`[ops-server-resource-provider.getRepository] Get ${requestUrl}`);
    return sendRequest(requestUrl, 'GET');
}

/**
 * `product_name`, `base_path` returned by this API are used for v3 docfx config generation.
 * Search `docset.product_name`, `docset.base_path` for there references.
 * @param {*} gitRepoUrl 
 */
const getDocSets = function (gitRepoUrl) {
    let requestUrl = `${_opBuildBaseUrl}${OPS_API.DOCSETS}` +
        `?${querystring.stringify({
            git_repo_url: gitRepoUrl,
            docset_query_status: 'Created'
        })}`;
    logger.info(`[ops-server-resource-provider.getDocSets] Get ${requestUrl}`);

    return sendRequest(requestUrl, 'GET')
        .then((docsets) => {
            if (!Array.isArray(docsets) || isResultEmpty(docsets)) {
                throw new Error(`[opBuildApiClient.getDocSets] invalid response: ${JSON.stringify(docsets)}`);
            }
            return docsets;
        }, (err) => {
            throw new Error(`[opBuildApiClient.getDocSets] invalid response`);
        });
}

const queryBuilds = function (
    repositoryId,
    branch,
    commit = '',
    start = new Date(Date.UTC(2015, 2, 25, 10, 0)),
    end = new Date(),
    target = 'Publish') {
    var queryData = {
        start: formatTime(start),
        end: formatTime(end),
        repository: repositoryId,
        branch: branch,
        target: target
    };
    if(commit) {
        queryData.commit = commit;
    }

    let requestUrl = `${_opBuildBaseUrl}${OPS_API.QUERY_BUILDS}?${querystring.stringify(queryData)}`;
    logger.info(`[ops-server-resource-provider.queryBuilds] Get ${requestUrl}`);

    return sendRequest(requestUrl, 'GET');
}

const triggerBuild = function (repositoryId, branch, forcePublish = true, target = 'Publish') {
    let requestUrl = `${_opBuildBaseUrl}${format(OPS_API.BUILD, { repositoryId: repositoryId })}`;
    let body = {
        branch_name: branch,
        force_publish: forcePublish,
        target: target
    }

    logger.info(`[ops-server-resource-provider.triggerBuild] Post ${requestUrl} with body: ${JSON.stringify(body)}`);
    return sendRequest(requestUrl, 'POST', body, [200, 201]);
};

const getBuildInfo = function (repositoryId, buildId) {
    let requestUrl = `${_opBuildBaseUrl}${format(OPS_API.BUILD_INFO, { repositoryId: repositoryId, buildId: buildId })}`;

    logger.info(`[ops-server-resource-provider.getBuildInfo] Get ${requestUrl}`);
    return sendRequest(requestUrl, 'Get');
};

/**
 * @deprecated, since docfx.json is now always loaded from local file, this function shouldn't be used.
 * @param {*} gitRepoUrl 
 * @param {*} branch 
 */
const getDocfxConfigs = function (gitRepoUrl, branch) {
    let urlParams = { git_repo_url: gitRepoUrl };
    branch && (typeof branch === 'string') && (urlParams.branch = branch);
    let requestUrl = `${_opBuildBaseUrl}${OPS_API.DOCFX_CONFIG}` +
        `?${querystring.stringify(urlParams)}`;
    logger.info(`[ops-server-resource-provider.getDocfxConfigs] Get ${requestUrl}`);

    return sendRequest(requestUrl, 'GET')
        .then((docfxConfigs) => {
            if (isResultEmpty(docfxConfigs)) {
                logger.verbose(`[opBuildApiClient.getDocfxConfigs] empty response: ${JSON.stringify(docfxConfigs)}`);
            }
            return docfxConfigs;
        });
}

/**
 * @deprecated, since op config.json is now always loaded from local file, this function shouldn't be used.
 * @param {*} gitRepoUrl 
 * @param {*} branch 
 */
const getOPPublishConfig = function (gitRepoUrl, branch) {
    let urlParams = { git_repo_url: gitRepoUrl };
    branch && (typeof branch === 'string') && (urlParams.branch = branch);
    let requestUrl = `${_opBuildBaseUrl}${OPS_API.OPS_PUBLISH_CONFIGURATION}` +
        `?${querystring.stringify(urlParams)}`;
    logger.info(`[ops-server-resource-provider.getOPPublishConfig] Get ${requestUrl}`);

    return sendRequest(requestUrl, 'GET')
        .then((opConfig) => {
            if (isResultEmpty(opConfig)) {
                logger.verbose(`[opBuildApiClient.getOPPublishConfig] empty response: ${JSON.stringify(opConfig)}`);
            }
            return opConfig;
        });
}

let _xOPBuildUserToken = '';
let _opBuildBaseUrl = '';

/**
 * Send a http request, return a promise, 
 * a json parsed object is resolved if response content-type is application/json.
 * @param {*} url 
 * @param {*} method 
 * @param {*} headers additional headers used for the request
 * @param {*} reqObj request object, will be sent in request body
 * @param {*} acceptedStatusCode valid acceptable http response status code
 */
let sendRequest = function (url, method, reqObj = {}, acceptedStatusCode = [200], headers = {}) {
    method = method || 'GET';
    headers[constants.X_OP_BUILD_USER_TOKEN_NAME] = _xOPBuildUserToken;
    let promise = new Promise((resolve, reject) => {
        request({
            url: url,
            method: method,
            headers: headers,
            json: true,
            body: reqObj
        }, (error, response, respObj) => {
            if (error) {
                logger.error(error);
                reject();
            }

            if (!acceptedStatusCode.includes(response.statusCode)) {
                logger.verbose(
                    `Request: [${decodeURIComponent(url)}] failed\n` +
                    `${respObj.error ? (`${respObj.error}(${response.statusCode}): `) : 'error: '}` +
                    `${respObj.message ? respObj.message : JSON.stringify(respObj)}`
                );
                reject();
            }
            resolve(respObj);
        })
    });
    return promise;
}

let formatTime = function (date) {
    function pad(n) { return n < 10 ? "0" + n : n }
    return date.getUTCFullYear()
        + pad(date.getUTCMonth() + 1)
        + pad(date.getUTCDate())
        + pad(date.getUTCHours())
        + pad(date.getUTCMinutes())
        + pad(date.getUTCSeconds())
}

/**
 * Validate if a JSON parsed result object is empty
 * @param {*} result : The JSON.parse() returned result, can either be Array or Object
 */
let isResultEmpty = function (result) {
    if (Array.isArray(result)) {
        return result.length <= 0;
    }

    // test object empty
    if (result.constructor === Object) {
        return Object.keys(result).length === 0;
    }
    
    return !!result;
}

module.exports.initialize = initialize;
module.exports.getRepositoryByUrl = getRepositoryByUrl;
module.exports.getRepositoryById = getRepositoryById;
module.exports.getDocSets = getDocSets;
module.exports.getDocfxConfigs = getDocfxConfigs;
module.exports.getOPPublishConfig = getOPPublishConfig;
module.exports.triggerBuild = triggerBuild;
module.exports.getBuildInfo = getBuildInfo;
module.exports.queryBuilds = queryBuilds;