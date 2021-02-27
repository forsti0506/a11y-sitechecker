import * as job from 'child_process';

import 'jasmine';

describe('a11y-sitechecker-bin', function () {
    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
    });

    it('should be the same url', async (done) => {
        const url = 'forsti.eu';
        const jobSpawn = job.spawn('node', [
            './dist/bin/a11y-sitechecker.js',
            url,
            '--config=tests/config.json',
            '--threshold=15000',
        ]);
        jobSpawn.stdout.on('data', (data) => {
            console.log(`\n${data}`);
        });

        jobSpawn.stderr.on('data', (data) => {
            console.error(`\n${data}`);
        });
        jobSpawn.on('exit', (code) => {
            console.log(code);
            expect(code).toBe(0);
            done();
        });
    });
});
