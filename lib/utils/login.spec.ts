import puppeteer from 'puppeteer';
import { Config } from '../models/config';
import { executeLogin } from './login';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions';

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
    });

    test('should fail because of missing selector', async () => {
        expect.assertions(1);
        config.login = {
            url: 'https://www.forsti.eu',
            steps: [
                {
                    submit: 'test',
                    input: [
                        {
                            selector: 'test',
                            value: 'test',
                        },
                    ],
                },
            ],
        };
        const browser = await puppeteer.launch(config.launchOptions);
        const pages = await browser.pages();
        await expect(executeLogin(pages[0], config)).rejects.toThrowError('waiting for selector `test` failed:');
    });

    test('should not be able to login', async () => {
        expect.assertions(1);
        config.login = {
            url: 'https://www.forsti.eu/wp-admin',
            steps: [
                {
                    submit: '#wp-submit',
                    input: [
                        {
                            selector: '#user_login',
                            value: 'test',
                        },
                        {
                            selector: '#user_pass',
                            value: 'test',
                        },
                    ],
                },
            ],
        };
        const browser = await puppeteer.launch(config.launchOptions);
        const pages = await browser.pages();
        await expect(executeLogin(pages[0], config)).resolves.toBe(1);
    });
});
