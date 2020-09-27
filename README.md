# Docs Validation

[![Build Status](https://dev.azure.com/ceapex/Engineering/_apis/build/status/Docs%20Validation/docascode.vscode-docs-build?branchName=master)](https://dev.azure.com/ceapex/Engineering/_build/latest?definitionId=1716&branchName=master)

This extension enables you to run build validation on a Docs conceptual or Learn repo at author time in VS Code. This means you can make sure your repo is free of validation issues before making a pull request.

## Prerequisites

- Install [git](https://git-scm.com/downloads).
- Clone your Docs or Learn repo locally in VS Code.
- All files in the repo must be saved.

## How to use the Docs Validation extension

1. Open a Docs conceptual or Learn repo in VS Code with the extension installed.
1. If you're a Microsoft employee, optionally sign in in by clicking **Docs Validation** from the VS Code status bar. You can still use the extension without signing in, but sign in is recommended to use the most recent build information for private repos.
1. Trigger a build by clicking **Yes** when prompted after sign in, by clicking **Docs Validation** on the status bar then clicking **Validate** from the drop-down menu, or by right-clicking any file in the repo and selecting **Validate this workspace folder**.
1. Build validation will run locally and all results will be output to the Problems pane.

![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/vscode-docs-build.gif?raw=true)

> **Note:** The first time you validate a repo, all the Docs build dependencies will be fetched and cached locally. Subsequent validation runs will be faster.

## Known issues

The following validations have incosnsistent results between Docs Build validation and local validation.

- bookmark-not-found: The rendering information required to validate bookmarks in schema-based content isn't available publicly, so if you aren't signed in as a Microsoft employee you might not get all broken bookmark results.
- author-not-found and ms-author-invalid: These validations require external API calls that aren't supported locally at this time, so no results will be returned for them.

## Troubleshooting

You might encounter the following issues when using the extension.

### Clone template repository or dependencies failed

When your validation fails with some error message like:

```bash
fatal: unable to access 'https://github.com/Microsoft/templates.docs.msft/': The requested URL returned error: 403
git-clone-failed Failure to clone the repository `https://github.com/Microsoft/templates.docs.msft#master`. This could be caused by an incorrect repository URL, please verify the URL on the Docs Portal (https://ops.microsoft.com). This could also be caused by not having the proper permission the repository, please confirm that the GitHub group/team that triggered the build has access to the repository.
Restore done in 11.77s

  1 Error(s), 0 Warning(s), 0 Suggestion(s)
Error: running 'docfx restore' failed with exit code: 1
```

Please try the following solutions:

1. Make sure you can access this repository https://github.com/Microsoft/templates.docs.msft on GitHub, if not, please join the `Microsoft` org by the this [website](https://repos.opensource.microsoft.com/Microsoft/), after that, try again.
1. Try to clone the template repository in a separated terminal by running the following command:

   ```bash
   $ git clone https://github.com/Microsoft/templates.docs.msft
   ```
1. If you have enabled 2FA on GitHub and you run into the following errors when you clone the repository, please follow [these instructions](https://stackoverflow.com/a/34919582/8335256).

   ```bash
   Cloning into 'templates.docs.msft'...
   Username for 'https://github.com': 928PJY
   Password tor 'https: //928PJY@github.com':
   remote: Invalid username or password.
   fatal: Authentication failed for https://github. com/Microsoft/templates.docs.msft/'
   ```

1. GitHub has recently enabled SSO on Microsoft-owned organizations. If you see the below errors, please follow the instructions there to enable SSO on your token so that local validation can pass through.
   ```bash
   fatal: unable to access 'https://github.com/Microsoft/templates.docs.msft/': The requested URL returned error: 403
   remote: The `microsoft' organization has enabled or enforced SAML SSO. To access
   remote: this repository, visit https://github.com/enterprises/microsoftopensource/sso?authorization_request=AEJANEWOPPW6YTNW5TYNW2K7OBDR3A5PN5ZGOYLONF5GC5DJN5XF62LEZYAF32PCVVRXEZLEMVXHI2LBNRPWSZGODVDHWBVPMNZGKZDFNZ2GSYLML52HS4DFVNHWC5LUNBAWGY3FONZQ
   ```
