import * as fs from 'fs';
import { AxePuppeteer } from '@axe-core/puppeteer';
import * as chalk from 'chalk';
import * as JSDOM from 'jsdom';
import { Spec } from 'axe-core';
import { A11ySitecheckerResult } from './models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from './models/config';
import odiff = require('odiff');
import { getUniqueSelector } from './utils/UniqueSelector';
import { isAbsoluteUrl, isFile } from './utils/helper-functions';

const alreadyVisited = [];
const alreadyParsed = [];
const notCheckedLinks = [];
const alreadyClicked = [];
const elementsToClick: Map<string, string[]> = new Map<string, string[]>();

const log = console.log;
const debug = console.debug;
let rootDomain;

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

function getEscaped(link: string): string {
    return link.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}\\[\]/]/gi, '_');
}

export async function analyzeSite(
    url: string,
    axeSpecs: Spec,
    page: Page,
    config: Config,
): Promise<A11ySitecheckerResult> {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        url = 'https://' + url;
    }
    const urlSplitted = url.split('/');
    if (!url.endsWith('/') && !isFile(url) && !urlSplitted[urlSplitted.length - 1]?.includes('#')) {
        url = url + '/';
    }

    log(chalk.blue('Start analyze of ' + url));

    await analyzeUrl(page, url, axeSpecs, config);

    const html = await page.content();
    const links = getLinks(html, url);

    let i = 1;
    for (const link of links) {
        debug(chalk.yellow('Visiting ' + i++ + ' of ' + links.length));
        if (!alreadyVisited.includes(link)) {
            await analyzeUrl(page, link, axeSpecs, config);
        }
    }

    await page.goto(url, { waitUntil: 'networkidle2' });

    if (elementsToClick.get(url)?.length > 0) {
        i = 1;
        for (const element of elementsToClick.get(url)) {
            debug(chalk.yellow('Clicking ' + i++ + ' of ' + elementsToClick.get(url).length));
            if (element && !alreadyClicked.includes(element)) {
                try {
                    await page.click(element);
                } catch (e) {
                    log('Seems like element not visible. Click it programmatically with javascript');
                    await page.evaluate((element) => {
                        (document.querySelector(element) as HTMLElement).click();
                    }, element);
                }
                try {
                    alreadyClicked.push(element);
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
                    await analyzeSite(page.url(), axeSpecs, page, config);
                } catch (e) {
                    log(chalk.yellow('seems like click was no navigation. Analyze and go back. ' + e));
                    if (page.url() !== url) {
                        await analyzeSite(page.url(), axeSpecs, page, config);
                    } else {
                        const test = results.violationsByUrl.filter((f) => f.url === url)[0];
                        const axe = await new AxePuppeteer(page);
                        axe.configure(axeSpecs);
                        const axeResults = await axe.analyze();
                        const diffs = odiff(test, axeResults);
                        for (const diff of diffs) {
                            if (diff.type === 'set') {
                                setValue(test, diff.path, diff.val);
                            }
                        }
                    }
                    await page.goto(url, { waitUntil: 'networkidle2' });
                }
            }
        }
    }

    i = 1;
    for (const link of links) {
        debug(chalk.yellow('parsing' + i++ + ' of ' + links.length));
        if (!alreadyParsed.includes(link)) {
            const res: A11ySitecheckerResult = await analyzeSite(link, axeSpecs, page, config);
            debug(chalk.yellow('Finished analyze of Site: ' + link));
            results = { ...results, ...res };
        }
    }
    results.analyzedUrls = alreadyVisited;

    return results;
}

function setValue(obj, path, value): void {
    // const a = path.split('.');
    let o = obj;
    while (path.length - 1) {
        const n = path.shift();
        if (!(n in o)) o[n] = {};
        o = o[n];
    }
    o[path[0]] = value;
}

function getLinks(html: string, url: string): string[] {
    if (alreadyParsed.includes(url)) {
        return [];
    }
    const dom = new JSDOM.JSDOM(html, { contentType: 'text/html' });
    const links: string[] = [];
    if (!rootDomain) {
        debug(chalk.green('RootDomain was set to: ' + url));
        rootDomain = url;
    }
    dom.window.document.querySelectorAll('a').forEach((element: HTMLAnchorElement) => {
        let link = element.href;
        if (link === '' && element.getAttributeNames().includes('ng-click')) {
            const uniqueSelector = getUniqueSelector(element, dom);
            if (elementsToClick.has(url)) {
                elementsToClick.get(url).push(uniqueSelector);
            } else {
                elementsToClick.set(url, [uniqueSelector]);
            }
        }
        if (isAbsoluteUrl(link) && link.includes(rootDomain)) {
            if (link.startsWith('//')) {
                link = url.startsWith('https') ? 'https:' + link : 'http:' + link;
            }
            if (!link.endsWith('/') && !link.includes('#') && !isFile(link)) {
                link = link + '/';
            }
            if (!links.includes(link) && !alreadyVisited.includes(link)) {
                links.push(link);
            }
        } else if (!isAbsoluteUrl(link) && !link.includes('#')) {
            let absoluteUrl = new URL(link, url).href;
            if (!absoluteUrl.endsWith('/') && !isFile(absoluteUrl)) {
                absoluteUrl = absoluteUrl + '/';
            }
            if (
                !links.includes(absoluteUrl) &&
                !alreadyVisited.includes(absoluteUrl) &&
                absoluteUrl.includes(rootDomain)
            ) {
                links.push(absoluteUrl);
            }
        } else if (!notCheckedLinks.includes(link)) {
            notCheckedLinks.push(link);
        }
    });
    dom.window.document
        .querySelectorAll('button, select, details, [tabindex]:not([tabindex="-1"])')
        .forEach((element: HTMLAnchorElement) => {
            if (!element.hasAttribute('disabled')) {
                const uniqueSelector = getUniqueSelector(element, dom);
                if (elementsToClick.has(url)) {
                    if (!elementsToClick.get(url).includes(uniqueSelector)) {
                        elementsToClick.get(url).push(uniqueSelector);
                    }
                } else {
                    elementsToClick.set(url, [uniqueSelector]);
                }
            }
        });
    alreadyParsed.push(url);
    return links;
}

async function analyzeUrl(page, url: string, axeSpecs: Spec, config: Config): Promise<void> {
    await page.goto(url, { waitUntil: 'networkidle2' });
    if (alreadyVisited.includes(url)) {
        debug(chalk.yellow('Already visited: ' + url));
        return;
    }
    log(chalk.blue('Currently analyzing ' + url));
    if (!fs.existsSync('images')) {
        fs.mkdirSync('images');
    }

    if (config.saveImages) {
        try {
            const imagePath = 'images/' + getEscaped(url) + '.png';
            await page.screenshot({ path: imagePath });
            debug(chalk.yellow('Saved Image ' + imagePath));
        } catch (error) {
            log(chalk.red(error + '. Image not saved. Analyze not stopped!'));
        }
    }

    let axeResults;
    try {
        const axe = await new AxePuppeteer(page);
        axe.configure(axeSpecs);
        axeResults = await axe.analyze();
    } catch (error) {
        log(chalk.red(error + '. Analyze now with networkidle0'));
        try {
            await page.goto(url, { waitUntil: 'networkidle0' });
            const axe = await new AxePuppeteer(page);
            axe.configure(axeSpecs);
            axeResults = await axe.analyze();
        } catch (e) {
            log(chalk.red(error + '. Analyze with networkidle0 failed too. Ignoring it' + e));
        }
    }
    if (axeResults) {
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
        log(
            chalk.green('Finished analyze of url: ' + url + '. Pushed ' + axeResults.violations.length + ' violations'),
        );
    }
}
