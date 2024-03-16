import { Config } from '../models/config';
import { markAllTabableItems } from './mark-all-tabable-items';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import puppeteer, { Browser } from 'puppeteer';
import { expect, jest, test } from '@jest/globals';

describe('markAllTabaleItems', () => {
    let config: Config;
    let urlResult: Partial<ResultByUrl>;
    let browser: Browser;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
        config.debugMode = true;
    });
    afterEach(async () => {
        await browser?.close();
        return cleanUpAfterTest(config);
    });
    test('should be able to call markAllTabableItems', async () => {
        expect.assertions(1);

        browser = await puppeteer.launch(config.launchOptions);
        const pages = await browser.pages();
        await pages[0].goto('https://forsti.eu');
        let nrOfCalls = 0;
        jest.spyOn(pages[0], 'evaluate').mockImplementation((fn) => {
            if (nrOfCalls === 8) {
                nrOfCalls++;
                return Promise.resolve(['test1', 'test2']);
            } else if (nrOfCalls === 9 || nrOfCalls === 10) {
                nrOfCalls++;
                return Promise.resolve('{"keyboardAccessible": "hello"}');
            } else {
                nrOfCalls++;
                return Promise.resolve(void 0);
            }
        });
        urlResult = { keyboardAccessibles: [], tabableImages: [] };
        try {
            return expect(
                markAllTabableItems(pages[0], 'https://forsti.eu', config, urlResult as ResultByUrl, {
                    click: ['testinger'],
                }),
            ).resolves.not.toThrow();
        } catch (e) {
            fail(e);
        }
    });
});
