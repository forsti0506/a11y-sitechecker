import { debug } from './helper-functions';
import { Config } from '../models/config';
import { exposeDepsJs } from './expose-deep-js';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

describe('get-links', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('expose debug function', async () => {
        expect(exposeDepsJs({ debug })).toContain('window["debug"] = function debug(debugMode');
    });
});
