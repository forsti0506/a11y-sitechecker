import 'jasmine';
import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';
import { entry } from '../dist';

describe('a11y-sitechecker', function () {
    let config;
    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
        spyOn(process, 'exit').withArgs(2).and.throwError('Exit with error 2');
        const optionValues = {
            json: true,
            config: './tests/config.json',
        };

        config = setupConfig(optionValues);
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
