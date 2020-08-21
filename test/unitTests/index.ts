import path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

export async function run(): Promise<void> {
    console.log(`enable codecode: ${process.env.COVERAGE}`);
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
            await nyc.report();
        }
    }
}

function setupCoverage() {
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