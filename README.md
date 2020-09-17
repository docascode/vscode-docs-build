# Docs Validation

[![Build Status](https://dev.azure.com/ceapex/Engineering/_apis/build/status/Docs%20Validation/docascode.vscode-docs-build?branchName=master)](https://dev.azure.com/ceapex/Engineering/_build/latest?definitionId=1716&branchName=master)

This extension enables you to run build validation on a Docs conceptual or Learn repo at author time in VS Code. This means you can make sure your repo is free of validation issues before making a pull request.

## Prerequisites

- You must be a Microsoft employee.
- Install [git](https://git-scm.com/downloads).
- Clone your Docs or Learn repo locally in VS Code.
- All files in the repo must be saved.

## How to use the Docs Validation extension

1. Open a Docs conceptual or Learn repo in VS Code with the extension installed.
1. Sign in by clicking **Docs Validation: Sign in to Docs** from the VS Code status bar.
1. Trigger a build by clicking **Yes** when prompted after sign in, by clicking **Docs Validation** on the status bar then clicking **Validate** from the drop-down menu, or by right-clicking any file in the repo and selecting **Validate this workspace folder**.
1. Build validation will run locally and all results will be output to the Problems pane.

![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/vscode-docs-build.gif?raw=true)

> **Note:** The first time you validate a repo, all the Docs build dependencies will be fetched and cached locally. Subsequent validation runs will be faster.

<!-- Can we pull these details from the public extension readme? The troubleshooting section might be helpful, but using images that was isn't accessible, so maybe we comment them out for now and build a better accessible readme when we add to the Docs Authoring Pack?

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

## Contacts

If you meet any problem or have any feedback about this extension, please Contact:

- Jiayin Pei(jipe@microsoft.com)
- DocFX VNext(docfxvnext@microsoft.com)



## Troubleshooting

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

    If you have enabled 2FA on GitHub and you run into the following errors when you clone the repository. Please follow the instruction of this [answer](https://stackoverflow.com/a/34919582/8335256).
    ![clone-template-failed-2FA](https://github.com/docascode/vscode-docs-build/blob/master/resources/clone-template-failed-2FA.png?raw=true)
    
    -->
