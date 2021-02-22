# Docs Validation

[![Build Status](https://dev.azure.com/ceapex/Engineering/_apis/build/status/Docs%20Validation/docascode.vscode-docs-build?branchName=master)](https://dev.azure.com/ceapex/Engineering/_build/latest?definitionId=1716&branchName=master)

This extension enables you to run build validation on a Docs conceptual or Learn repo at author time in VS Code. This means you can make sure your repo is free of validation issues before making a pull request.

## Prerequisites

- Install [git](https://git-scm.com/downloads).
- Clone your Docs or Learn repo locally in VS Code.
- All files in the repo must be saved.

## How to use the Docs Validation extension

### Full-repository validation

1. Open a Docs conceptual or Learn repo in VS Code with the extension installed.
1. For the first time you use the extension, you will be asked to choose your user type between **Microsoft employee** and **Public contributor** before you can use full-repository validation.
1. For **Microsoft employee**, you are required to sign in before using full-repository validation. You can click **Docs Validation** on the status bar then click **Sign in** from the drop-down menu to sign in.
1. After signing in, you can trigger a validation by clicking **Validate** when prompted. You can also click **Docs Validation** on the status bar then click **Validate** from the drop-down menu, or by right-clicking any file in the repo and selecting **Validate this repository**.
1. Build validation will run locally and all results will be output to the Problems pane.

![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/vscode-docs-build.gif?raw=true)

> **Note:** The first time you validate a repo, all the Docs build dependencies will be fetched and cached locally. Subsequent validation runs will be faster.

### Real-time validation

1. Open a Docs conceptual or Learn repo in VS Code with the extension installed.
2. For the first time you use the extension, you will be asked to choose your user type between **Microsoft employee** and **Public contributor** before you can use real-time validation.
3. The real-time validation is enabled by default, you can disable it in the extension settings (Go to Settings -> Docs Validation -> Uncheck **Real-time Validation: Automatically Enable**). You will be asked to reload the extension after you disable real-time validation.

![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/enable-real-time-validation.gif?raw=true)

4. For **Microsoft employee**, the extension will check your sign-in status before real-time validation starts to work. If you haven't signed in or your credential expired, you will be asked to sign in. After sign-in succeeds, real-time validation will start automatically.
5. With real-time validation enabled, you will see validation issues (if any) while you are working on the repository (eg. modifying files, creating files and deleting files etc.).

![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/real-time-validation-exp.gif?raw=true)


## Known issues

### Inconsistent results between Docs Build validation and full-repository validation.

- bookmark-not-found: The rendering information required to validate bookmarks in schema-based content isn't available publicly, so if you aren't signed in as a Microsoft employee you might not get all broken bookmark results.
- author-not-found and ms-author-invalid: These validations require external API calls that aren't supported locally at this time, so no results will be returned for them.

### Inconsistent results between real-time validation and full-repository validation.

These inconsistent results mainly come from two situations: the currently edited file needs validation results from other files and the currently edited file affects other files' validation results. The real-time validation now will only validates the open files. Therefore, some inconsistent results will show when the files related to these two situations are not opened.

Inconsistent results caused by the currently edited file needs validation results from other files:

- publish-url-conflict
- output-path-conflict
- Content or Metadata uniqueness
    - duplicate-uid
    - xref-property-conflict
    - moniker-overlapping
    - duplicate-title
    - altText-duplicate
    - duplicate-h1
    - ...
- bookmark-not-found
- Validation on hierarchy (for example `unit-no-module-parent`)

Inconsistent results caused by the currently edited file affects other files' validation results:

- xref-not-found
- bookmark-not-found
- circular-reference
- include-not-found
- file-not-found

Other situations:
- Pull-request-only suggestions will be ignored by full-repository validation but will be reported by real-time validation.
- Include files will not be validated before you open any file includes them.
- .openpublishing.redirection.json will not be validated before you open any content file (.md or .yml).

> **Note:** Validation is not available currently for workspaces with multiple folders.

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

1. If you see the below errors while cloning the template repository, this is caused by that you used the `Git Credential Manager Core` before GitHub enabled the SSO, and you need to re-authorize the application.
   ```bash
   $ git clone https://github.com/microsoft/templates.docs.msft.git
   Cloning into 'templates.docs.msft'...
   remote: The `microsoft' organization has enabled or enforced SAML SSO. To access
   remote: this repository, you must re-authorize the OAuth Application `Git Credential Manager`.
   fatal: unable to access 'https://github.com/microsoft/templates.docs.msft.git/': The requested URL returned error: 403
   ```

   Please follow the steps below to re-authorize, you can either:
   - Sign in with your browser.

      a. Go to [Github application setting page](https://github.com/settings/applications).
      
      b. Go inside `Git Credential Manager` and click `Revoke access`.

      c. Retry to clone the repository in commander/ terminal.

      d. Select `Sign in with your browser` in the pop-up window.
   - Sign in with `Personal Access Token`.

      a. Go to [Github token setting page](https://github.com/settings/tokens).
         
      b. Generate a new token if you don't have one. Enter the note of the token, check `repo` in `Select scopes` section, and click `Generate token`.

      c. Enable the SSO for the token used in `Git Credential Manager Core`.

      ![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/enable-sso.png?raw=true)

      d. Retry to clone the repository in commander/ terminal.

      e. Enter `Personal Access Token` in the pop-up window.


## License

[MIT](https://raw.githubusercontent.com/docascode/vscode-docs-build/master/LICENSE)

## Issue

[File a issue](https://github.com/docascode/vscode-docs-build/blob/master/docs/file-issue.md)

## How to Contribute

[Contribution guideline](https://github.com/docascode/vscode-docs-build/blob/master/docs/contribution-guide.md)

**All contributions are welcome!**
