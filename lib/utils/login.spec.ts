import { executeLogin } from './login';
import puppeteer from 'puppeteer';
import { Config } from '../models/config';
import { Browser } from 'puppeteer';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions';

describe('login', () => {
    let config: Config;
    let browser: Browser;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
        browser = await puppeteer.launch(config.launchOptions);
        const page = (await browser.pages())[0];
        await page.setViewport({
            width: 1920,
            height: 1080,
        });
    });
    afterEach(async () => {
        await cleanUpAfterTest(config);
        await browser.close();
    });

    it('should escape if no login parameter', (done) => {
        browser.pages().then((pages) => {
            executeLogin(pages[0], config).then((retCode) => {
                expect(retCode).toBe(0);
                done();
            });
        });
    });

    it('should fail because of missing selector', (done) => {
        config.login = {
            url: 'http://www.forsti.eu',
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
        ]};

        browser.pages().then((pages) => {
            executeLogin(pages[0], config).catch((err) => {
                expect(err.message).toContain('waiting for selector `test` failed:');
                done();
            });
        });
    });

    it('should not be able to login', (done) => {
        config.login = {url: "http://www.forsti.eu/wp-admin",
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
        ]};
        browser.pages().then((pages) => {
            executeLogin(pages[0], config).then((r) => {
                expect(r).toBe(1);
                done();
            });
        });
    });
});
