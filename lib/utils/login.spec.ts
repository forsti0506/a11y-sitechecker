import puppeteer from 'puppeteer';
import { Config } from '../models/config';
import { executeLogin } from './login';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

describe('login', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('should escape if no login parameter', async () => {
        expect.assertions(1);
        const browser = await puppeteer.launch(config.launchOptions);
        const pages = await browser.pages();
        await expect(executeLogin(pages[0], config)).resolves.toBe(0);
        await browser.close();
    });
});
