import job from 'child_process';
import 'jest';
import { Config } from '../lib/models/config';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions';

describe('a11y-sitechecker-bin', function () {
    let config: Config;
    beforeAll(function () {
        console.log('Starting BIN Test');
    });
    beforeEach(async function () {
        config = await initBeforeTest();
    });
    afterEach(async () => {
        await cleanUpAfterTest(config);
    });

    it('should exit with code 0', (done) => {
        const url = 'https://www.forsti.eu';
        const jobSpawn = job.spawn('node', [
            './dist/bin/a11y-sitechecker.js',
            url,
            '--config=tests/config.json',
            '--threshold=15000',
        ]);
        jobSpawn.stderr.on('data', (data) => {
            console.error(`\n${data}`);
        });
        jobSpawn.stdout.on('data', (data) => {
            console.log(`\n${data}`);
        });
        jobSpawn.on('exit', (code) => {
            expect(code).toBe(0);
            done();
        });
    });

    it('should exit with code 2', (done) => {
        const url = 'www.forsti.eu';
        const jobSpawn = job.spawn('node', ['./dist/bin/a11y-sitechecker.js', url, '--config=tests/config.json']);
        jobSpawn.stderr.on('data', (data) => {
            console.error(`\n${data}`);
        });
        jobSpawn.stdout.on('data', (data) => {
            console.log(`\n${data}`);
        });
        jobSpawn.on('exit', (code) => {
            expect(code).toBe(2);
            done();
        });
    });

    it('should exit with error code 3', (done) => {
        const url = 'httpss://forsti.eu';
        const jobSpawn = job.spawn('node', [
            './dist/bin/a11y-sitechecker.js',
            url,
            '--config=tests/config_without_urls.json',
        ]);
        jobSpawn.stderr.on('data', (data) => {
            console.error(`\n${data}`);
        });
        jobSpawn.stdout.on('data', (data) => {
            console.log(`\n${data}`);
        });
        jobSpawn.on('exit', (code) => {
            expect(code).toBe(3);
            done();
        });
    });
});
