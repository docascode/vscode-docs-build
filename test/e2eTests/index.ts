import glob from 'glob';
import Mocha from 'mocha';
import path from 'path';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'bdd',
        timeout: 1000 * 120, // 2 minutes
        color: true,
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise((resolve, reject) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return reject(err);
            }

            // Add files to the test suite
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                // Run the mocha test
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}
