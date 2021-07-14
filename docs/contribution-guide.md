# Contribution guide

## Prerequisites

- Node.js (8.11.1 or later)
- Npm (5.6.0 or later)
- VS Code (1.40.0 or later)

## Run and development

```bash
# 1. Clone the project
$ git clone git@github.com:docascode/vscode-docs-build.git
$ cd vscode-docs-build

# 2. Install dependencies
$ npm i

# 3. Open the project by VS Code
$ code .

# 4. Press `F5` to run the extension
```

## Debug

### Debug the extension

1. Set a breakpoint.
2. Select `Run extension` in the `Run and Debug` Tab.
3. Press `F5` to run the extension
4. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

### Debug the E2E test

1. Set a breakpoint.
2. Set `VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN` in [launch.json](../.vscode/launch.json)
3. Run `git submodule update --init` in terminal.
4. Select `Launch extension e2e tests` in the `Run and Debug` Tab.
5. Press `F5` to run the extension
6. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

### Debug the UT

1. Set a breakpoint.
2. Select `Launch extension unit tests` in the `Run and Debug` Tab.
3. Press `F5` to run the extension
4. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

### Debug the benchmark test

1. Set a breakpoint.
2. Set `VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN` in [launch.json](../.vscode/launch.json)
3. Select `Launch extension benchmark tests` in the `Run and Debug` Tab.
4. Press `F5` to run the extension
5. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

### Debug the runtime dependencies update script

1. Set a breakpoint.
2. Select `Launch runtime dependencies update script` in the `Run and Debug` Tab.
3. Press `F5` to run the extension
4. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

## Scripts

- `npm run test`: Run all the test including E2E test(**requires two tokens be set by environment variable**) and Unit test
- `npm run test:unit`: Run Unit test
- `npm run benchmark`: Run benchmark
- `npm run lint`: Run ESLint

## Related KeyVaults

In the CI pipeline, we need some secrets for the following purposes, for security consideration, those secret is stored in the Azure KeyVault `docs-validation-kv-ci` (Microsoft Corp tenant `DevRel - DocsValidation.VSCode.Extension (Dev)`)

| Secret                             | Type                | Usage                                                        | Corresponding account    | Expiration |
| ---------------------------------- | ------------------- | ------------------------------------------------------------ | ------------------------ | ---------- |
| CodeCovToken                       | CodeCov PAT         | Used to publish the PR code coverage result into the CodeCov | -                        | 90d        |
| GitHubTokenToCloneDocsTemplateRepo | GitHub PAT          | Used to clone template repository in the CI test             | VSC-service-account      | 90d        |
| OpBuildUserToken                   | OP build user token | Used to call OP Build API in the CI test                     | VSC-service-account(PPE) | 70d        |

### Rotate instruction

1. CodeCovToken

   1. Pleas make sure you are the contributor or admin of this repository
   2. Go to https://app.codecov.io/gh/docascode/vscode-docs-build/settings, click the `Regrenerate` button, then you will get a new token.

2. GitHubTokenToCloneDocsTemplateRepo

   1. Sign in with the Github Account `VSC-service-account`.
   1. Go to https://github.com/settings/tokens, Delete the original one with name `vscode-docs-build CI pipeline` and generate a new one.

3. OpBuildUserToken

    1. Before the original token expires, Please follow this [instruction](https://ceapex.visualstudio.com/Engineering/_git/Docs.Build.Tools?path=%2FREADME.md&_a=preview&version=GBdevelop&anchor=how-to-refersh-an-opbuildusertoken) to refresh the token.
