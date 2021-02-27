import * as process from 'child_process';

import 'jasmine';

describe('a11y-sitechecker-bin', function () {
    it('should be the same url', async (done) => {
        const url = 'forsti.eu';
        const job = process.spawn('node', ['./dist/bin/a11y-sitechecker.js', url, '--config=config.json']);
        job.stdout.on('data', (data) => {
            expect(data.toString()).toContain(
                '#############################################################################################',
            );
            done();
        });

        job.stderr.on('data', (data) => {
            console.error(`\n${data}`);
        });

        job.on('exit', function (code, signal) {
            console.log('child process exited with ' + `code ${code} and signal ${signal}`);
        });
    });
});
