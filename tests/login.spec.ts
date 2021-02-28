import 'jasmine';
import { executeLogin } from '../lib/utils/login';
import * as puppeteer from 'puppeteer';
import { Config } from '../lib/models/config';
import { Browser } from 'puppeteer';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

describe('login', function () {
    let config: Config;
    let browser: Browser;

    beforeEach(async function () {
        config = initBeforeTest();
        config.timeout = 15000;
        browser = await puppeteer.launch(config.launchOptions);
        const page = (await browser.pages())[0];
        await page.setViewport({
            width: 1920,
            height: 1080,
        });
    });
    afterEach(async () => {
        cleanUpAfterTest(config);
        await browser.close();
    });

    it('should escape if no login parameter', async (done) => {
        executeLogin('https://forsti.eu', (await browser.pages())[0], config).then((retCode) =>
            expect(retCode).toBe(0),
        );
        done();
    });

    it('should escape if no login parameter', async (done) => {
        config.login = [
            {
                submit: 'test',
                input: [
                    {
                        selector: 'test',
                        value: 'test',
                    },
                ],
            },
        ];

        await executeLogin('https://forsti.eu', (await browser.pages())[0], config).catch((err) => {
            expect(err.message).toContain('waiting for selector `test` failed:');
            done();
        });
    });

    it('should not be able to login', async (done) => {
        config.login = [
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
        ];

        await executeLogin('https://forsti.eu/wp-admin', (await browser.pages())[0], config).then((r) => {
            expect(r).toBe(1);
            done();
        });
    });
});