// import * as job from 'child_process';
// import 'jasmine';
// import { Config } from '../lib/models/config';
// import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
//
// describe('a11y-sitechecker-bin', function () {
//     let config: Config;
//     beforeEach(function () {
//         config = initBeforeTest();
//     });
//     afterEach(() => {
//         cleanUpAfterTest(config);
//     });
//
//     it('should exit with code 0', async (done) => {
//         const url = 'www.forsti.eu';
//         const jobSpawn = job.spawn('node', [
//             './dist/bin/a11y-sitechecker.js',
//             url,
//             '--config=tests/config.json',
//             '--threshold=15000',
//         ]);
//         jobSpawn.stderr.on('data', (data) => {
//             console.error(`\n${data}`);
//         });
//         jobSpawn.on('exit', (code) => {
//             expect(code).toBe(0);
//             done();
//         });
//     });
//
//     it('should exit with code 2', async (done) => {
//         const url = 'www.forsti.eu';
//         const jobSpawn = job.spawn('node', ['./dist/bin/a11y-sitechecker.js', url, '--config=tests/config.json']);
//         jobSpawn.stderr.on('data', (data) => {
//             console.error(`\n${data}`);
//         });
//         jobSpawn.on('exit', (code) => {
//             expect(code).toBe(2);
//             done();
//         });
//     });
// });
