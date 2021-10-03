import { Config } from './../../lib/models/config';
import { cleanUpAfterTest, initBeforeTest } from '../../lib/utils/test-helper-functions.spec';
describe('it-tests', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('dummy test', async () => {
        expect(true).toBe(true);
    });
});

// it('should exit with code 0', (done) => {
//     const url = 'https://www.forsti.eu';
//     const jobSpawn = job.spawn('node', [
//         './dist/bin/a11y-sitechecker.js',
//         url,
//         '--config=tests/config.json',
//         '--threshold=15000',
//     ]);
//     jobSpawn.on('exit', (code) => {
//         expect(code).toBe(0);
//         done();
//     });
// });

// it('should exit with code 2', (done) => {
//     const url = 'www.forsti.eu';
//     const jobSpawn = job.spawn('node', ['./dist/bin/a11y-sitechecker.js', url, '--config=tests/config.json']);
//     jobSpawn.on('exit', (code) => {
//         expect(code).toBe(2);
//         done();
//     });
// });

// test('should exit with error code 3', (done) => {
//     const url = 'httpss://forsti.eu';
//     const jobSpawn = job.spawn('node', [
//         './dist/bin/a11y-sitechecker.js',
//         url,
//         '--config=tests/config_without_urls.json',
//     ]);
//     jobSpawn.on('exit', (code) => {
//         expect(code).toBe(3);
//         done();
//     });
// });
