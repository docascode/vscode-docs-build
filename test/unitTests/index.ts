import path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

export async function run(): Promise<void> {
    const nyc = process.env.COVERAGE ? setupCoverage() : undefined;
    const mocha = new Mocha({
        ui: 'bdd',
        timeout: 50000,
        color: true
    });

    const testsRoot = path.resolve(__dirname, '.');

    const files = glob.sync('**/**.test.js', { cwd: testsRoot });

    // Add files to the test suite
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

    try {
        await new Promise((resolve, reject) => {
            // Run the mocha test
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        });
    }
    finally {
        if (nyc) {
            nyc.writeCoverageFile();
            await nyc.report();
        }
    }
}

function setupCoverage() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NYC = require('nyc');
    const nyc = new NYC({
        cwd: path.join(__dirname, '..', '..', '..'),
        exclude: ['**/test/**', '.vscode-test/**'],
        reporter: ['lcovonly'],
        reportDir: 'coverage/unit',
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