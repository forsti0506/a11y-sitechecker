import { Page } from 'puppeteer';
import { error, saveScreenshot, waitForHTML } from './helper-functions';
import * as chalk from 'chalk';
import { Config } from '../models/config';

export async function executeLogin(url: string, page: Page, config: Config): Promise<void> {
    if (!config.login) {
        return;
    }
    let failedLoads = 0;
    let failed = true;
    while (failedLoads < 3 && failed) {
        failed = false;
        try {
            try {
                await page.goto(url, { waitUntil: 'networkidle2' });
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
            } catch (e) {
                error(e);
            }
            await waitForHTML(page);
            await saveScreenshot(page, config.imagesPath, 'loginSite.png', config.saveImages);
        } catch (e) {
            failedLoads++;
            failed = true;
            error('Error in opening LoginPage' + e);
        }
    }

    for (const step of config.login) {
        for (const input of step.input) {
            await page.waitForSelector(input.selector);
            await page.type(input.selector, input.value);
        }
        await page.click(step.submit);
    }
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await waitForHTML(page);
        await saveScreenshot(page, config.imagesPath, 'afterLogin.png', config.saveImages);
    } catch (e) {
        // eslint-disable-next-line prettier/prettier
        console.log(chalk.red('No Navigation after Login. Please check if it\'s working as expected!'));
    }
}
