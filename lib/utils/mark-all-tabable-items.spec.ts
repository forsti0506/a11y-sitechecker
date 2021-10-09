import { Config } from '../models/config';
import { markAllTabableItems } from './mark-all-tabable-items';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import puppeteer from 'puppeteer';
import 'jest';

describe('markAllTabaleItems', () => {
    let config: Config;
    let urlResult: ResultByUrl;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
        config.debugMode = true;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });
    test('should not be able to login', async () => {
        expect.assertions(1);

        const browser = await puppeteer.launch(config.launchOptions);
        const pages = await browser.pages();
        await pages[0].goto('https://www.forsti.eu');
        jest.spyOn(pages[0], 'evaluate').mockImplementation((fn) => {
            return Promise.resolve(['test1', 'test2']);
        });

        try {
            return expect(
                markAllTabableItems(pages[0], 'https://www.forsti.eu', config, urlResult),
            ).resolves.not.toThrow();
        } catch (e) {
            fail(e);
        }
    });
});
