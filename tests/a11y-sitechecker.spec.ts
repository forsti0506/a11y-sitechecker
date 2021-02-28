import 'jasmine';
import { setupAxeConfig } from '../lib/utils/setup-config';
import { entry } from '../dist';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import { Config } from '../lib/models/config';

describe('a11y-sitechecker', function () {
    let config: Config;
    beforeEach(function () {
        config = initBeforeTest();
        spyOn(process, 'exit').withArgs(2).and.throwError('Exit with error 2');
    });
    afterEach(() => {
        cleanUpAfterTest(config);
    });

    it('should be the same url', async (done) => {
        config.threshold = 1000;
        if (config.axeConfig) config.axeConfig.locale = 'de';
        const axeConfig = setupAxeConfig(config);
        entry(config, axeConfig, 'forsti.eu', true).then((e) => {
            expect(e.url).toBe('forsti.eu');
            done();
        });
    });

    it('should exit with code 2', async (done) => {
        config.threshold = 0;
        if (config.axeConfig) config.axeConfig.locale = 'de';
        const axeConfig = setupAxeConfig(config);

        entry(config, axeConfig, 'forsti.eu', true).then(
            (e) => {
                done();
            },
            (error) => {
                expect(error.message).toContain('Exit with error 2');
                done();
            },
        );
    });
});
