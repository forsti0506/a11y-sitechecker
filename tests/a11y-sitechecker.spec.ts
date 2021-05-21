import { setupAxeConfig } from '../lib/utils/setup-config';
import { entry } from '../dist';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions';
import { Config } from '../lib/models/config';

describe('a11y-sitechecker', function () {
    let config: Config;
    beforeEach(async function () {
        config = await initBeforeTest();
        spyOn(process, 'exit').withArgs(2).and.throwError('Exit with error 2');
    });
    afterEach(async () => {
        await cleanUpAfterTest(config);
    });

    it('should be the same url', (done) => {
        const time1 = Date.now();
        config.threshold = 1000;
        if (config.axeConfig) config.axeConfig.locale = 'de';
        const axeConfig = setupAxeConfig(config);
        entry(config, axeConfig, 'forsti.eu', true).then((e) => {
            expect(e.length).toBe(2);
            expect(e[0].testEnvironment?.windowHeight).toEqual(1080);
            expect(e[1].testEnvironment?.windowHeight).toEqual(400);
            const time2 = Date.now();
            console.log((time2 - time1) / 1000 + 's');
            done();
        });
    });

    it('should be the same url', (done) => {
        const time1 = Date.now();
        config.threshold = 1000;
        config.resultTypes = ['violations', 'inapplicable', 'incomplete', 'passes'];
        if (config.axeConfig) config.axeConfig.locale = 'de';
        const axeConfig = setupAxeConfig(config);
        entry(config, axeConfig, 'forsti.eu', true).then((e) => {
            expect(e.length).toBe(2);
            expect(e[0].testEnvironment?.windowHeight).toEqual(1080);
            expect(e[1].testEnvironment?.windowHeight).toEqual(400);
            const time2 = Date.now();
            console.log((time2 - time1) / 1000 + 's');
            done();
        });
    });

    it('should exit with threshold not met', (done) => {
        config.threshold = 0;
        if (config.axeConfig) config.axeConfig.locale = 'de';
        const axeConfig = setupAxeConfig(config);

        entry(config, axeConfig, 'forsti.eu', true).then(
            (result) => {
                expect(result).toBe([]);
                done();
            },
            (error) => {
                expect(error.message).toContain('Threshold not met');
                done();
            },
        );
    });
});
