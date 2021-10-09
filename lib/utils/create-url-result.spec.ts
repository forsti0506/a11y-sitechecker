import { Config } from '../models/config';
import { createUrlResult } from './create-url-result';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import { AxeResults } from 'axe-core';

describe('get-links', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('create urlResutl with null values', async () => {
        expect((await createUrlResult('', {} as AxeResults)).violations).toBe(undefined);
    });

    test('create urlResutl with null values', async () => {
        expect(
            (await createUrlResult('', { violations: [{ v1: 'test' }] } as unknown as AxeResults)).violations,
        ).toStrictEqual([{ v1: 'test' }]);
    });
});
