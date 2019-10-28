# docfx

VS Code extension to provide the Local build experience for docs.

## Features

- Sign in/out to Docs, and display the status in statusBar
![OAuth](./resources/vscode-docfx-OAuth.gif)

- Build the current workspace folder
- Display the real-time build streaming output in `Docs` channel
- Display all diagnostics in `Problem` view with detail information after build finished.

## Upcoming Features:

- Build 

## Requirements

- Dotnet installed

## Extension Settings

// TODO: Add configuration description

## Known Issues

- Build environment: default to be `PROD`, and provide extension config `buildEnvironment` to customize.
- Does the user care about real-time build streaming output? Or they just need just care about the build status(building/builld finished).
- Docfx.yml
    - The docfx.yml is generated during  the build time, so there will be a uncommit change in the local git repository: we are going to remove it after the build finished.
    - The diagnostics on the docfx.yml will bring confusion, user cannot fix the error/warning by changing this file: we are trying to convert them to the real source file(openpublishing.publish.config.json or docfx.json)(so as the server build)
- Provide two command:
- Build the current workspace folder
    - Skip restore if dependency already be restored. (6s ~ 8s)
    - Skip fetch validation rules is it already existed. (30s ~ 40s)
- Rebuild the current workspace folder
    - Always restore and re-fetch validation rules.
