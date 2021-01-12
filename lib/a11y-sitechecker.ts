import * as fs from 'fs';
import { AxePuppeteer } from '@axe-core/puppeteer';
import * as chalk from 'chalk';
import * as JSDOM from 'jsdom';
import { Spec } from 'axe-core';
import { A11ySitecheckerResult } from './models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from './models/config';

const alreadyVisited = [];
const alreadyParsed = [];
const notCheckedLinks = [];

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
    if (!url.endsWith('/') && !isFile(url)) {
        url = url + '/';
    }

    log(chalk.blue('Start analyze of ' + url));

    await analyzeUrl(page, url, axeSpecs, null, config);

    const html = await page.content();
    const links = getLinks(html, url);

    for (const link of links) {
        await analyzeUrl(page, link, axeSpecs, url, config);
    }
    for (const link of links) {
        if (!alreadyParsed.includes(link)) {
            const res: A11ySitecheckerResult = await analyzeSite(link, axeSpecs, page, config);
            debug(chalk.yellow('Finished analyze of: ' + link));
            results = { ...results, ...res };
        }
    }
    results.analyzedUrls = alreadyParsed;
    return results;
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
    alreadyParsed.push(url);
    return links;
}

function isAbsoluteUrl(url): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(url);
}

async function analyzeUrl(page, url: string, axeSpecs: Spec, backUrl: string, config: Config): Promise<void> {
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

    // alreadyParsed.push(url);
    try {
        const axe = await new AxePuppeteer(page);
        axe.configure(axeSpecs);
        const axeResults = await axe.analyze();
        // results.violations = {...results.violations, ...axeResults.violations};
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
        log(chalk.green('Finished analyze of url: ' + url));
    } catch (error) {
        log(chalk.red(error + '. Analyze not stopped.'));
    }
    if (backUrl) {
        await page.goto(backUrl, { waitUntil: 'networkidle2' });
    }
}

function isFile(path: string): boolean {
    return path.split('/').pop().indexOf('.') > -1;
}
