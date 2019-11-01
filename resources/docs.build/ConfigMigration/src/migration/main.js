'use strict';

const fs = require('fs');
const path = require('path');

const yaml = require('js-yaml');

const constants = require('../../config/config')
const logger = require('../logger');

// resource providers
const opsPublishConfigProvider = require('../source-provider/ops-publish-config-provider');
const docfxConfigProvider = require('../source-provider/docfx-json-provider');
const docsetInfoProvider = require('../source-provider/docset-info-provider');
const opsRedirectionProvider = require('../source-provider/ops-redirection-provider');

// utils
const gitHubUtils = require('../lib/github-utils');

// content fillers(migrate to v3 form)
const baseUrlMigrator = require('./migrator/base-url-migrator');
const buildScopeMigrator = require('./migrator/build-scope-migrator');
const redirectionMigrator = require('./migrator/redirection-migrator');
const dependencyMigrator = require('./migrator/dependency-migrator');
const themeMigrator = require('./migrator/theme-migrator');
const routeMigrator = require('./migrator/route-migrator');
const monikerRangeMigrator = require('./migrator/moniker-range-migrator');
const contributionMigrator = require('./migrator/contribution-migrator');
const documentIdMigrator = require('./migrator/document-id-migrator');
const globalMetadataMigrator = require('./migrator/global-metadata-migrator');
const fileMetadataMigrator = require('./migrator/file-metadata-migrator');
const outputMigrator = require('./migrator/output-config-migrator');
const localizationMigrator = require('./migrator/localization-migrator');
const xrefMigrator = require('./migrator/xref-migrator');



/**
 * Validate command line parameters.
 */
const validCmdParams = function (cmdParams) {
    if (cmdParams.hostName && (typeof cmdParams.hostName !== 'string')) {
        logger.logger.error('[main.validCmdParams] hostName must have a value if presents');
        return false;
    }
    if ((!cmdParams.basePath || !cmdParams.productName)) {
        // not passing basePath or productName, need api call to fetch them, check token & repository url
        if (!cmdParams.repository || (typeof cmdParams.repository !== 'string')) {
            logger.logger.error('[main.validCmdParams] repository is not specified, exiting...');
            return false;
        }
        if (!cmdParams.opBuildUserToken) {
            logger.logger.info('[main.validCmdParams] op-build-user-token is not specified, using `process.env.op-build-user-token`');
            if (!process.env.opBuildUserToken) {
                logger.logger.error('[main.validCmdParams] `process.env.op-build-user-token` is not specified, exiting...');
                return false;
            }
        }
        if (!cmdParams.env) {
            logger.logger.info('[main.validCmdParams] env is not specified, using `process.env.NODE_ENV`');
        }
    }
    if (!cmdParams.branch || (typeof cmdParams.branch !== 'string')) {
        logger.logger.info('[main.validCmdParams] branch is not specified, using repository\'s default branch');
    }
    if (!cmdParams.directory) {
        logger.logger.info('[main.validCmdParams] directory is not specified, using `.` by default');
    }
    if (!cmdParams.outputDirectory) {
        logger.logger.info(`[main.validCmdParams] output-directory is not specified, using repository path: ${cmdParams.directory}`)
    }
    return true;
}

/**
 * Prepare required configs and for each invoke each config generation.
 * On failed: return false.
 * On succeeded: return a map of {docsetName: v3DocfxConfig}
 */
async function main(cmdParams) {
    // initialize logger
    let repositoryDirectory = cmdParams.directory || '.';

    // transport log to console only if logDirectory equals console-only
    let logDirectory = cmdParams.logDirectory || cmdParams.outputDirectory || repositoryDirectory || '.';
    if (logDirectory === 'console-only') {
        logger.consoleOnlyLogger();
    } else {
        // by default write to output root
        logger.resetDest(logDirectory);
    }

    // validate command line parameters
    if (!validCmdParams(cmdParams)) {
        logger.logger.error('[migratie.main] wrong command line parameters, please refer to ' +
            '`node .\\src\\migration\\migrate --help` for more information');
        return false;
    }

    logger.logger.info(`[migrate.main] migrating repository: ${repositoryDirectory}`);
    // create output dir
    let outputDirectory = cmdParams.outputDirectory ? cmdParams.outputDirectory : repositoryDirectory
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory);
    }

    let env = process.env.NODE_ENV || cmdParams.env;
    // normalize git remote info before gathering resources
    cmdParams.repository = gitHubUtils.normalizeGitHubRemote(cmdParams.repository);
    // read from remote/local resource provider (3 parts, docfx.json, op publish, product name )
    let OPSPublishConfig, docfxConfigs;
    try {
        OPSPublishConfig = await opsPublishConfigProvider.getLocalOPPublishJsonConfig(repositoryDirectory);
        docfxConfigs = await docfxConfigProvider.getAllLocalDocfxConfigs(repositoryDirectory, OPSPublishConfig.docsets_to_publish);
    } catch (err) {
        if (!OPSPublishConfig || !docfxConfigs) {
            logger.logger.error(`[migrate.main] fail to load configs, error: ${err}`);
            return false;
        }
    }

    // {docsetA: {docfxConfigProperty1: 1, docfxConfigProperty2: 2}} =>
    // {docsetA: {docfxConfig: {docfxConfigProperty1: 1, docfxConfigProperty2: 2}}}
    docfxConfigs = Object.entries(docfxConfigs).reduce((acc, [docsetName, docfxConfig]) => {
        acc[docsetName] = {
            docfxConfig: docfxConfig.build
        };
        return acc;
    }, {});
    OPSPublishConfig.docsets_to_publish.forEach(docsetToPublish => {
        docfxConfigs[docsetToPublish.docset_name].docsetToPublish = docsetToPublish;
    });
    // assign docsetInfo to each docfxConfig object, if cmd parameters have product_name, base_path, the API call will be ignored
    // defaultDocsetConfig include 3 members: 'docfxConfig', 'docsetToPublish', 'docsetInfo'(from API)
    let [defaultDocsetName, defaultDocsetConfig] = Object.entries(docfxConfigs)[0];
    // call api to get docsets info when multiple docsets, keep direct generation path(single docset) for easier local debug experience
    let docsetsInfo = OPSPublishConfig.docsets_to_publish.length > 1
                    ? await docsetInfoProvider.getDocsetsInfo({
                        repository: cmdParams.repository,
                        opBuildUserToken: cmdParams.opBuildUserToken,
                        env
                    })
                    : await docsetInfoProvider.getDocsetsInfo({
                        repository: cmdParams.repository,
                        defaultDocsetName,
                        basePath: cmdParams.basePath,
                        productName: cmdParams.productName,
                        opBuildUserToken: cmdParams.opBuildUserToken,
                        siteName: cmdParams.siteName,
                        env
                    });
    // a list of docset info, which has product_name, base_path
    docsetsInfo.forEach(docsetInfo => {
        if (docfxConfigs.hasOwnProperty(docsetInfo.name)) {
            docfxConfigs[docsetInfo.name].docsetInfo = docsetInfo;
        }
    });

    let baseUrl = baseUrlMigrator.migrate(cmdParams.hostName, defaultDocsetConfig.docsetInfo.base_path, env);
    let redirections = await opsRedirectionProvider.getOPRedirections(repositoryDirectory);

    let v3DocfxConfigs = Object.entries(docfxConfigs).reduce((defaultV3DocfxConfigs, [docsetName, docsetConfig]) => {
        defaultV3DocfxConfigs[docsetName] = generateSingleDocsetConfig({
            OPSPublishConfig,
            docsetName,
            docsetConfig,
            redirections: redirections.redirections,
            repository: cmdParams.repository,
            branch: cmdParams.branch,
            baseUrl,
            hostName: cmdParams.hostName,
            repositoryDirectory,
            outputDirectory,
            logDirectory,
            scanRedirection: cmdParams.scanRedirection,
            writeFile: cmdParams.writeFile,
            userCache: cmdParams.userCache
        });
        return defaultV3DocfxConfigs;
    }, {});
    
    return Object.entries(v3DocfxConfigs).some(([_, v3DocfxConfig]) => v3DocfxConfig === false)
    ? false
    : v3DocfxConfigs;
}


/**
 * Return false when fail.
 * Return docfx config object when succeed.
 */
async function generateSingleDocsetConfig({
    OPSPublishConfig, // for dependencies, contributions, output
    docsetName,
    docsetConfig,
    redirections,
    repository,
    branch,
    baseUrl,
    hostName,
    repositoryDirectory,
    outputDirectory,
    logDirectory,
    scanRedirection,
    writeFile,
    userCache
} = {}) {
    if (logDirectory !== 'console-only') {
        logger.resetDest(path.join(logDirectory, docsetConfig.docsetToPublish.build_source_folder));
    }

    logger.logger.info(`[main.generateSingleDocsetConfig] generating config for docset: ${docsetName}`);

    // initialize default template
    let defaultV3DocfxConfig = require('../../config/default-docfx-config');

    // migrate all fields
    // set base url
    defaultV3DocfxConfig.baseUrl = baseUrl;

    // migrate content config
    // assign content.include + reource.include => config.files; content.exclude + resource.exclude => config.excludes
    Object.assign(defaultV3DocfxConfig, buildScopeMigrator.migrate(docsetConfig.docfxConfig));

    // migrate redirection config
    // the generated `files` & `exclude` in content-migrator is prerequisite of this step for globbing files
    // gather all existing configurations(local and remote)
    let v3Redirections = redirectionMigrator.migrate(
        redirections,
        repositoryDirectory,
        {
            includes: defaultV3DocfxConfig.files,
            excludes: defaultV3DocfxConfig.exclude
        },
        scanRedirection,
        [hostName],
        docsetConfig.docsetToPublish.build_source_folder);
    Object.assign(defaultV3DocfxConfig, v3Redirections.redirection);

    // migrate dependency config
    defaultV3DocfxConfig.dependencies = dependencyMigrator.migrate(OPSPublishConfig.dependent_repositories, branch, docsetConfig.docsetToPublish);

    // migrate themes
    defaultV3DocfxConfig.template = themeMigrator.migrate(OPSPublishConfig.dependent_repositories, branch);

    // migrate route config
    defaultV3DocfxConfig.routes = routeMigrator.migrate(docsetConfig.docfxConfig);

    // migrate monikerRange config
    defaultV3DocfxConfig.monikerRange = monikerRangeMigrator.migrate(docsetConfig.docfxConfig);

    // migrate contribution
    defaultV3DocfxConfig.contribution = contributionMigrator.migrate(OPSPublishConfig, docsetConfig.docfxConfig, repository, branch);

    // migrate document id
    defaultV3DocfxConfig.documentId = documentIdMigrator.migrate(docsetConfig.docfxConfig);

    // migrate global metadata
    defaultV3DocfxConfig.globalMetadata = globalMetadataMigrator.migrate(docsetConfig.docfxConfig, docsetConfig.docsetToPublish);

    // migrate file metadata
    defaultV3DocfxConfig.fileMetadata = fileMetadataMigrator.migrate(docsetConfig.docfxConfig);

    // migrate xref config
    let xref = xrefMigrator.migrate(docsetConfig.docfxConfig);
    if (xref.length > 0)
        defaultV3DocfxConfig.xref = xref;

    // migrate output config
    defaultV3DocfxConfig.output = outputMigrator.migrate(OPSPublishConfig);

    // migration localization config
    let localizationConfig = localizationMigrator.migrate(branch);
    // only set localizationConfig when bilingual is true
    localizationConfig.bilingual && (defaultV3DocfxConfig.localization = localizationConfig);

    // migrate other easier properties
    // name & product & site_name
    defaultV3DocfxConfig.name = docsetName;
    defaultV3DocfxConfig.product = docsetConfig.docsetInfo.product_name;
    if (docsetConfig.docsetInfo.site_name) {
        defaultV3DocfxConfig.siteName = docsetConfig.docsetInfo.site_name;
    }

    // add git-hub config property when `user-cache` flag is on
    if (userCache) {
        Object.assign(defaultV3DocfxConfig, constants.GIT_HUB_CONFIG)
    }

    // remove null value on root
    Object.entries(defaultV3DocfxConfig).forEach(([key, value]) => {
        if (value == undefined) {
            delete defaultV3DocfxConfig[key];
        }
    });

    // output 'docfx.yml' to output directory, default output to the same input directory
    // only write when write-file flag is on
    if (writeFile) {
        let configOutputPath = path.join(outputDirectory, docsetConfig.docsetToPublish.build_source_folder || '.', 'docfx.yml');
        fs.writeFileSync(configOutputPath, yaml.dump(defaultV3DocfxConfig));
    }

    return defaultV3DocfxConfig;
}

module.exports = main;
