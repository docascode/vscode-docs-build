# Docs Build - Local Validation

This is a VS Code extension to provide the Local Build Validation experience for a docs repository.

## Features

- Ability to sign in/out of the dependant Docs APIs, and display the status in the status bar
![OAuth](https://github.com/docascode/vscode-docs-build/blob/master/resources/VSCode-Docs-OAuth.gif?raw=true)

- Build the current workspace folder
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
