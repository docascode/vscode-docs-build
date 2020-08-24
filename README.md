# Docs Build - Local Validation

[![Build Status](https://dev.azure.com/ceapex/Engineering/_apis/build/status/Docs%20Validation/docascode.vscode-docs-build?branchName=master)](https://dev.azure.com/ceapex/Engineering/_build/latest?definitionId=1716&branchName=master)

This is a VS Code extension to provide the Local Build Validation experience for a docs repository.

## Features

- Ability to sign in/out of the dependant Docs APIs, and display the status in the status bar
- Validate the current workspace folder
- Display the real-time build streaming output in the `Docs` channel
- Display all diagnostics in the `Problem` view with detailed information after a build has finished.
![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/vscode-docs-build.gif?raw=true)

## Requirements

- [git](https://git-scm.com/downloads) installed

## Performance benchmark

> Notes:
> 1. On the first build of a Docs repository on your local machine, all the dependencies (template repository, Cross Repository Reference, build dependencies, etc.) will need to be fetched, and this will take some time to complete (depending on your network).
> 2. All of the fetched resources will be cached locally, and additional local builds will run much faster.
> 3. A restore will be performed on each VS Code session (VS Code).

### Windows

> Device Spec(Surface Book2):  
> - CPU: 1.9GHz 4 Cores Intel Core i7-8650U
> - Memory: 16GB 1867 MHz DDR4  
> - Storage: SSD  
> - Battery settings: Power mode(plugged in): Best performance

| azure-docs-pr | docs | edge-developer | sql-docs-pr |
|  --- | --- | --- | --- |
| 00:01:22 | 00:00:48 | 00:00:03 | 00:01:07 |

### Mac

> Device Spec(MacBook Pro):  
> - CPU: 2.2GHz 6 Cores Intel Core i7  
> - Memory: 32GB 2400 MHz DDR4  
> - Storage: SSD  

| azure-docs-pr | docs | edge-developer | sql-docs-pr |
|  --- | --- | --- | --- |
| 00:00:50 | 00:00:38 | 00:00:03 | 00:00:54 |

## Limitation

1. You will have to save the file prior to starting a local validation.

## Contacts

If you meet any problem or have any feedback about this extension, please Contact:

- Jiayin Pei(jipe@microsoft.com)
- DocFX VNext(docfxvnext@microsoft.com)

## Q&A

1. Clone Dependencies failed

    GitHub has recently enabled SSO on Microsoft-owned organizations. If you see the below errors, please follow the instructions there to enable SSO on your token so that local validation can pass through.
    ![clone-failed-sso](https://github.com/docascode/vscode-docs-build/blob/master/resources/clone-failed-sso.jpg?raw=true)

1. Clone template Failed

    When your validation fails with some error message like:
    ![clone-template-failed](https://github.com/docascode/vscode-docs-build/blob/master/resources/clone-template-failed.png?raw=true)

    Please try the following solutions:

    1. Make sure you can access this repository https://github.com/Microsoft/templates.docs.msft on GitHub, if not, please join the `Microsoft` org by the this [website](https://repos.opensource.microsoft.com/Microsoft/), after that, try again.

    2. Try to clone the template repository in a separated terminal by running the following command:

    ```bash
    $ git clone https://github.com/Microsoft/templates.docs.msft
    ```

    If you have enabled the 2FA on GitHub and you run into the following errors when you clone the repository. Please follow the instruction of this [answer](https://stackoverflow.com/a/34919582/8335256)
    ![clone-template-failed-2FA](https://github.com/docascode/vscode-docs-build/blob/master/resources/clone-template-failed-2FA.png?raw=true)
