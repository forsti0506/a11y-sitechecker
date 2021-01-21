import * as fs from 'fs';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { Spec } from 'axe-core';
import { A11ySitecheckerResult } from './models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from './models/config';
import { debug, error, getEscaped, log, saveScreenshot, success, waitForHTML } from './utils/helper-functions';
import { getLinks } from './utils/get-links';

const alreadyVisited = [];
const alreadyParsed = [];
const notCheckedLinks = [];
const alreadyClicked: Map<string, string[]> = new Map<string, string[]>();
const elementsToClick: Map<string, string[]> = new Map<string, string[]>();

const rootDomain = { value: '' };

let results: A11ySitecheckerResult = {
    testEngine: undefined,
    testEnvironment: undefined,
    testRunner: undefined,
    timestamp: new Date().toISOString(),
    toolOptions: undefined,
    url: '',
    violations: [],
    violationsByUrl: [],
    inapplicable: [],
    incomplete: [],
    passes: [],
    analyzedUrls: [],
};

export async function analyzeSite(
    url: string,
    axeSpecs: Spec,
    page: Page,
    config: Config,
): Promise<A11ySitecheckerResult> {
    if (config.urlsToAnalyze) {
        for (const urlPath of config.urlsToAnalyze) {
            await analyzeUrl(page, urlPath, axeSpecs, config);
        }
    } else {
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            url = 'https://' + url;
        }
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        log('Start analyze of ' + url);

        await analyzeUrl(page, url, axeSpecs, config);

        const html = await page.content();
        const links = getLinks(
            html,
            url,
            config.ignoreElementAttributeValues,
            alreadyParsed,
            rootDomain,
            elementsToClick,
            notCheckedLinks,
            alreadyVisited,
        );

        let i = 1;
        for (const link of links) {
            debug('Visiting ' + i++ + ' of ' + links.length);
            if (!alreadyVisited.includes(link)) {
                await analyzeUrl(page, link, axeSpecs, config);
            }
        }

        debug('All links of ' + url + ' visited. Now Clicking elements');
        await page.goto(url, { waitUntil: 'networkidle2' });
        await waitForHTML(page);

        if (elementsToClick.get(url)?.length > 0) {
            i = 1;
            for (const element of elementsToClick.get(url)) {
                debug('Clicking ' + i++ + ' of ' + elementsToClick.get(url).length);
                if (element && !alreadyClicked.get(url)?.includes(element)) {
                    debug('Element to be clicked: ' + element);
                    try {
                        if (alreadyClicked.get(url)) {
                            alreadyClicked.get(url).push(element);
                        } else {
                            alreadyClicked.set(url, [url]);
                        }
                        await page.evaluate((element) => {
                            (document.querySelector(element) as HTMLElement).click();
                        }, element);
                        await waitForHTML(page);
                    } catch (e) {
                        log('Seems like element not found. ' + e);
                    }
                    try {
                        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
                        await waitForHTML(page);
                        await analyzeSite(page.url(), axeSpecs, page, config);
                    } catch (e) {
                        log('seems like click was no navigation. Analyze and do it. ' + e);
                        if (page.url() !== url && !alreadyVisited.includes(url)) {
                            await analyzeSite(page.url(), axeSpecs, page, config);
                            await page.goto(url, { waitUntil: 'load' });
                            await waitForHTML(page);
                        } else if (config.analyzeClicksWithoutNavigation) {
                            debug('Experimintal feature! Please check if there are to much clicks!');
                            const axe = await new AxePuppeteer(page);
                            axe.configure(axeSpecs);
                            const axeResults = await axe.analyze();
                            pushResults(url + '_' + element + '_clicked', axeResults);
                        }
                    }
                }
            }
        }

        i = 1;
        for (const link of links) {
            debug('parsing' + i++ + ' of ' + links.length);
            if (!alreadyParsed.includes(link)) {
                const res: A11ySitecheckerResult = await analyzeSite(link, axeSpecs, page, config);
                debug('Finished analyze of Site: ' + link);
                results = { ...results, ...res };
            }
        }
    }
    results.analyzedUrls = alreadyVisited;
    return results;
}

function pushResults(url: string, axeResults): void {
    results.violationsByUrl.push({
        url: url,
        violations: axeResults.violations,
        passes: axeResults.passes,
        inapplicable: axeResults.inapplicable,
        incomplete: axeResults.incomplete,
        testEngine: axeResults.testEngine,
        testEnvironment: axeResults.testEnvironment,
        testRunner: axeResults.testRunner,
        timestamp: axeResults.timestamp,
        toolOptions: axeResults.toolOptions,
    });
    alreadyVisited.push(url);
    success('Finished analyze of url: ' + url + '. Pushed ' + axeResults.violations.length + ' violations');
}

async function analyzeUrl(page, url: string, axeSpecs: Spec, config: Config): Promise<void> {
    if ((await page.url()) !== url) {
        await page.goto(url, { waitUntil: 'load' });
        await waitForHTML(page);
    } else {
        debug('URL already open.' + url);
    }
    if (alreadyVisited.includes(url)) {
        debug('Already visited: ' + url);
        return;
    }
    log('Currently analyzing ' + url);
    if (!fs.existsSync('images')) {
        fs.mkdirSync('images');
    }

    if (config.saveImages) {
        try {
            await saveScreenshot(page, config.imagesPath, getEscaped(url) + '.png', config.saveImages);
        } catch (e) {
            error(error + '. Image not saved. Analyze not stopped!');
        }
    }

    let axeResults;
    try {
        const axe = await new AxePuppeteer(page);
        axe.configure(axeSpecs);
        axeResults = await axe.analyze();
    } catch (e) {
        error(error + '. Error Axe');
    }
    if (axeResults) {
        pushResults(url, axeResults);
    }
}
