# Development guide

## First Install

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

### Debug the UT

1. Set a breakpoint.
2. Select `Launch extension unit tests` in the `Run and Debug` Tab.
3. Press `F5` to run the extension
4. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

### Debug the benchmark test

1. Set a breakpoint.
2. Set `VSCODE_DOCS_BUILD_EXTENSION_BUILD_USER_TOKEN` and `VSCODE_DOCS_BUILD_EXTENSION_GITHUB_TOKEN` in [launch.json](../.vscode/launch.json)
3. Select `Launch extension benchmark tests` in the `Run and Debug` Tab.
4. Press `F5` to run the extension
5. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

### Debug the runtime dependencies update script

1. Set a breakpoint.
2. Select `Launch runtime dependencies update script` in the `Run and Debug` Tab.
3. Press `F5` to run the extension
4. Check the `Variables`, `Call Stack` and use the `Watch` in the `Run and Debug` Tab.

## Scripts

- `npm run test`: Run all the test
- `npm run benchmark`: Run benchmark
- `npm run lint`: Run tslint