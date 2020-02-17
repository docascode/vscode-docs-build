import { use } from 'chai';
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

use(require('chai-subset'));

export async function run(): Promise<void> {
    const nyc = process.env.COVERAGE ? setupCoverage() : undefined;
    const mocha = new Mocha({
        ui: 'bdd',
        timeout: 50000
    });
    mocha.useColors(true);

    const testsRoot = path.resolve(__dirname, '.');

    let files = glob.sync('**/**.test.js', { cwd: testsRoot });

    // Add files to the test suite
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    try {
        await new Promise((c, e) => {
            // Run the mocha test
            mocha.run(failures => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        });
    }
    finally {
        if (nyc) {
            nyc.writeCoverageFile();
            nyc.report();
        }
    }
}

function setupCoverage() {
    const NYC = require('nyc');
    const nyc = new NYC({
        cwd: path.join(__dirname, '..', '..', '..'),
        exclude: ['**/test/**', '.vscode-test/**'],
        reporter: ['lcovonly'],
        reportDir: 'coverage/component',
        all: true,
        instrument: true,
        hookRequire: true,
        hookRunInContext: true,
        hookRunInThisContext: true,
    });

    nyc.reset();
    nyc.wrap();

    return nyc;
}