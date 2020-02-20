import path from 'path';

export const rootPath = path.resolve(__dirname, '..');

const nodeModulesPath = path.join(rootPath, 'node_modules');
export const nycPath = path.join(nodeModulesPath, 'nyc', 'bin', 'nyc.js');
export const mochaPath = path.join(nodeModulesPath, 'mocha', 'bin', 'mocha');

const coverageRootPath = path.join(rootPath, 'coverage');
export const unitTestCoverageRootPath = path.join(coverageRootPath, 'unit');

export const nodePath = path.join(process.env.NVM_BIN
    ? `${process.env.NVM_BIN}${path.sep}`
    : '', 'node');

export const testAssetsPath = path.join(rootPath, 'testAssets');

const benchmarkTestPath = path.join(rootPath, '.benchmark');
export const benchmarkTestAssetsPath = path.join(benchmarkTestPath, 'assets');
export const benchmarkTestReportsPath = path.join(benchmarkTestPath, 'reports');


