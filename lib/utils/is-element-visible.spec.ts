import { Config } from '../models/config';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

describe('is-element-visible', () => {
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
