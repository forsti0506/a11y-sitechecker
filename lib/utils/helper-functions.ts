import { Page } from 'puppeteer';
import * as chalk from 'chalk';
import * as fs from 'fs';

let debugMode = false;

export function setDebugMode(bool: boolean): void {
    debugMode = bool;
}

export function isAbsoluteUrl(url: string): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(url);
}

export function debug(message: string, ...optionalParams: unknown[]): void {
    if (debugMode) {
        console.debug(chalk.yellow(message, optionalParams));
    }
}

export function error(message: string, ...optionalParams: unknown[]): void {
    console.error(chalk.red(message, optionalParams));
}

export function log(message?: unknown, ...optionalParams: unknown[]): void {
    console.info(chalk.blue(message, optionalParams));
}

export function success(message?: unknown, ...optionalParams: unknown[]): void {
    console.info(chalk.green(message, optionalParams));
}

export async function waitForHTML(page: Page, timeout = 30000): Promise<void> {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 2;

    while (checkCounts++ <= maxChecks) {
        const html = await page.content();
        const currentHTMLSize = html.length;

        const bodyHTMLSize = await page.evaluate(() => document.body?.innerHTML?.length);

        debug('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, ' body html size: ', bodyHTMLSize);

        if (lastHTMLSize && bodyHTMLSize && lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else countStableSizeIterations = 0; //reset the counter

        if (countStableSizeIterations >= minStableSizeIterations) {
            log('Page rendered fully..');
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await page.waitForTimeout(checkDurationMsecs);
    }
}

export function getEscaped(link: string): string {
    return link.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}\\[\]/]/gi, '_');
}
export function shoouldElementBeIgnored(element: Element, elementstoIgnore: string[] | undefined): boolean {
    if (!elementstoIgnore) return false;
    let shouldElementBeIgnored = false;
    for (let i = 0; i < element.attributes.length; i++) {
        shouldElementBeIgnored = elementstoIgnore.some((e) => element.attributes.item(i)?.nodeValue?.includes(e));
        if (shouldElementBeIgnored) break;
    }
    return shouldElementBeIgnored;
}

export async function saveScreenshot(
    page: Page,
    path: string | undefined,
    fileName: string | undefined,
    saveImage: boolean | undefined,
): Promise<void> {
    if (saveImage) {
        try {
            await page.screenshot({ path: path + '/' + fileName });
            debug(path + '/' + fileName + ' saved');
        } catch (error) {
            log(error + '. Image not saved. Analyze not stopped!');
        }
    }
}

export function writeToJsonFile(data: string, path: string): void {
    log(chalk.blue('#############################################################################################'));
    log(chalk.blue(`Writing results to ${path}/results.json`));
    log(chalk.blue('#############################################################################################'));
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    fs.writeFileSync(path + '/results.json', data);
}