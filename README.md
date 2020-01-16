# Docs Build

VS Code extension to provide the Local build experience for docs repository.

## Features

- Sign in/out to Docs, and display the status in statusBar
![OAuth](https://github.com/docascode/vscode-docs-build/blob/dev/resources/VSCode-Docs-OAuth.gif?raw=true)

- Build the current workspace folder
- Display the real-time build streaming output in `Docs` channel
- Display all diagnostics in `Problem` view with detail information after build finished.
![OAuth](https://github.com/docascode/vscode-docs-build/blob/dev/resources/vscode-docs-build.gif?raw=true)

## Requirements

- [git](https://git-scm.com/downloads) installed

## Performance benchmark

> Notes: 
> 1. At the first time you build the Docs repository on your local machine, we need to restore all the dependencies(Template repository and CRR repositories, build dependencies), it will take some time, which depends on your network.
> 2. We will cache all the restored resource.
> 3. We only run restore on VS Code re-open.

### Windows

> Device Spec(Surface Book2):  
> - CPU: 1.9GHz 4 Cores Intel Core i7-8650U  
> - Memory: 16GB 1867 MHz DDR4  
> - Storage: SSD  

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

1. We only support building the saved files now.

## Contacts

If you meet any problem or have any feedback about this extension, please Contact:

- Jiayin Pei(jipe@microsoft.com)
- DocFX VNext(docfxvnext@microsoft.com)
