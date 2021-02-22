import 'jasmine';

import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';
import { entry } from '../dist';

describe('a11y-sitechecker-bin', function () {
    beforeEach(function () {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
        spyOn(process, 'exit').and.stub();
    });

    it('testcall', async (done) => {
        const commander = { json: true, config: './tests/config.json' };
        const config = setupConfig(commander);
        config.threshold = 1000;
        if (config.axeConfig) config.axeConfig.locale = 'de';
        const axeConfig = setupAxeConfig(config);

        entry(config, axeConfig, 'www.forsti.eu').then(
            (e) => {
                done();
            },
            (error) => {
                console.log(error);
            },
        );
    });
});
