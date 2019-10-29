# Docs Build

VS Code extension to provide the Local build experience for docs.

## Features

- Sign in/out to Docs, and display the status in statusBar
![OAuth](https://github.com/928PJY/vscode-docs-build/blob/dev/resources/VSCode-Docs-OAuth.gif?raw=true)

- Build the current workspace folder
- Display the real-time build streaming output in `Docs` channel
- Display all diagnostics in `Problem` view with detail information after build finished.
![OAuth](https://github.com/928PJY/vscode-docs-build/blob/dev/resources/vscode-docs-build.gif?raw=true)

## Upcoming Features:

- Provide two command:
    - Restore: Restore the external dependecies.
    - Build: Build the repository(Offline Command)

## Requirements

- [Dotnet](https://dotnet.microsoft.com/download) installed
- [NodeJs](https://nodejs.org/en/download/) installed

## Known Issues

- Docfx.yml
    - The docfx.yml is generated during the build time, so there will be a uncommit change in the local git repository: we are going to remove it after the build finished.
    - The diagnostics on the docfx.yml will bring confusion, user cannot fix the error/warning by changing this file: Docfx v3 are going to use v2 config directly, so the warning/error will be reported directly on the corresponding config with right location information.


## Contacts

If you meet any problem or have any feedback about this extension, please Contact:

- Jiayin Pei(jipe@microsoft.com)
- Docfx VNext(docfxvnext@microsoft.com)
