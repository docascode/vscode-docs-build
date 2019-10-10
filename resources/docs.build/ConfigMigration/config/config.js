/**
 * Project configurations.
 */
'use strict';

const CONSTANTS = {
    DOCFX_JSON_CONFIG_FILENAME: "docfx.json",
    OP_PUBLISH_JSON_CONFIG_FILENAME: ".openpublishing.publish.config.json",
    OP_PUBLISH_REDIRECTION_FILENAME: ".openpublishing.redirection.json",
    X_OP_BUILD_USER_TOKEN_NAME: "X-OP-BuildUserToken",
    OP_BUILD_BASE_URL: {
        PROD: "https://op-build-prod.azurewebsites.net",
        SANDBOX: "https://op-build-sandbox2.azurewebsites.net",
        PERF: "https://op-build-perf.azurewebsites.net",
        INTERNAL: "https://op-build-internal.azurewebsites.net"
    },
    DEPENDENCY_TO_EXCLUDE: ["_themes", "_themes.pdf", "_repo.en-us"],
    GIT_HUB_CONFIG: {
        gitHub: {
            resolveUsers: true,
            userCache: "user_profile.json"
        }
    },
    HOST_NAME: {
        PROD: "docs.microsoft.com",
        SANDBOX: "ppe.docs.microsoft.com"
    },
    ERROR_MSG: {
        JSON_SYNTAX_ERROR: "Json syntax is incorrect, please lint the json file(https://jsonlint.com/)"
    }
}

module.exports = CONSTANTS;