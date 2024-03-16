import { Page } from 'puppeteer';
import chalk from 'chalk';
import { SitecheckerViewport } from '../models/config';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

export function isAbsoluteUrl(url: string): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(url);
}

export function debug(debugMode = false, message: string, ...optionalParams: unknown[]): void {
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

export async function waitForHTML(page: Page, timeout = 30000, debugMode = false): Promise<void> {
    // initPendingRequest(page);
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

        debug(debugMode, 'last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, ' body html size: ', bodyHTMLSize);

        if (lastHTMLSize && bodyHTMLSize && lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else countStableSizeIterations = 0; //reset the counter

        if (countStableSizeIterations >= minStableSizeIterations) {
            log('Page rendered fully..');
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await new Promise((r) => setTimeout(r, checkDurationMsecs));
    }
    // await waitForAllRequests();
}

export function getEscaped(link: string): string {
    return link.replace(/[`~ !@#$%^&*()_|+\-=?;:'",.<>{}\\[\]/]/gi, '_').replace(/\n/g, '');
}

export function shouldElementBeIgnored(element: Element, elementstoIgnore: string[] | undefined): boolean {
    if (!elementstoIgnore) return false;
    let shouldElementBeIgnored = false;
    for (let i = 0; i < element.attributes.length; i++) {
        shouldElementBeIgnored = elementstoIgnore.some((e) => element.attributes.item(i)?.nodeValue?.includes(e));
        if (shouldElementBeIgnored) break;
    }
    return shouldElementBeIgnored;
}

export function writeToJsonFile(data: string, path: string, vp: SitecheckerViewport): void {
    log(chalk.blue('#############################################################################################'));
    log(chalk.blue(`Writing results to ${path}/results_${vp.width}_${vp.height}'.json`));
    log(chalk.blue('#############################################################################################'));
    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }
    writeFileSync(path + '/results_' + vp.width + '_' + vp.height + '.json', data);
}

export function endsWithAny(array: string[], toCheck: string): boolean {
    return array.some((suffix) => {
        return toCheck.endsWith(suffix);
    });
}
