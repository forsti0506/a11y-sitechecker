import * as fs from 'fs';
import {AxePuppeteer} from '@axe-core/puppeteer';
import * as chalk from 'chalk';
import * as puppeteer from 'puppeteer';
import * as JSDOM from 'jsdom';
import {Spec} from 'axe-core';
import {A11ySitecheckerResult} from './models/a11y-sitechecker-result';

const alreadyVisited = [];
const alreadyParsed = [];
const notCheckedLinks = [];

const log = console.log;

let results: A11ySitecheckerResult = {
    testEngine: undefined,
    testEnvironment: undefined,
    testRunner: undefined,
    timestamp: '',
    toolOptions: undefined,
    url: '',
    violations: [], violationsByUrl: [], inapplicable: [], incomplete: [], passes: []
};

function getEscaped(link: string): string {
    return link.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}\\[\]/]/gi, '_');
}

export async function analyzeSite(url: string, axeSpecs: Spec): Promise<A11ySitecheckerResult> {
    if (!url.startsWith('https://')) {
        url = 'https://' + url;
    }
    if (!url.endsWith('/')) {
        url = url + '/';
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 1920,
        height: 1080
    });

    await analyzeUrl(page, url, axeSpecs);
    const html = await page.content();
    const links = getLinks(html, url);

    for (const link of links) {
        if (!alreadyVisited.includes(link)) {
            await analyzeUrl(page, link, axeSpecs, url);
        }
    }
    await browser.close();
    let count = 0;
    for (const link of links) {
        if (count >= 1) break;
        if (!alreadyParsed.includes(link)) {
            const res: A11ySitecheckerResult = await analyzeSite(link, axeSpecs);
            alreadyParsed.push(link);
            results = {...results, ...res};
        }
        count++;
    }
    return results;
}

function getLinks(html: string, url: string): string[] {
    const dom = new JSDOM.JSDOM(html, {contentType: 'text/html'});
    const links: string[] = [];
    const rootDomain = new URL(url).hostname;
    dom.window.document.querySelectorAll('a').forEach(
        (element: HTMLAnchorElement) => {
            let link = element.href;
            if (isAbsoluteUrl(link) && link.includes(rootDomain)) {
                if (link.startsWith('//')) {
                    link = url.startsWith('https') ? 'https:' + link : 'http:' + link;
                }
                if (!link.endsWith('/') && !link.includes('#') && !isFile(link)) {
                    link = link + '/';
                }
                if (!links.includes(link) && !isFile(link)) {
                    links.push(link);
                }
            } else if (!isAbsoluteUrl(link) && !link.includes('#')) {
                let absoluteUrl = url + '/' + link;
                if (!absoluteUrl.endsWith('/') && !isFile(absoluteUrl)) {
                    absoluteUrl = absoluteUrl + '/';
                }
                if (!links.includes(absoluteUrl) && !isFile(absoluteUrl)) {
                    links.push(absoluteUrl);
                }
            } else if (!notCheckedLinks.includes(link)) {
                notCheckedLinks.push(link);
            }
        }
    );
    return links;
}


function isAbsoluteUrl(url): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(url);
}

async function analyzeUrl(page, url: string, axeSpecs: Spec, backUrl?: string): Promise<void> {
    log(chalk.blue('Currently analyzing ' + url));
    await page.goto(url, {waitUntil: 'networkidle2'});
    if (!fs.existsSync('images')) {
        fs.mkdirSync('images');
    }
    await page.screenshot({path: 'images/' + getEscaped(url) + '.png'});
    alreadyParsed.push(url);
    try {
        const axe = await new AxePuppeteer(page);
        axe.configure(axeSpecs);
        const axeResults = await axe.analyze();
        // results.violations = {...results.violations, ...axeResults.violations};
        results.violationsByUrl.push({url: url, violations: axeResults.violations});
        alreadyVisited.push(url);
        log(chalk.green('Finished analyze of url.'));
    } catch (error) {
        log(chalk.red( error + '. Analyze not stopped.'));
    }
    if(backUrl) {
        await page.goto(backUrl, {waitUntil: 'networkidle2'});
    }
}

function isFile(path: string): boolean {
    return path.split('/').pop().indexOf('.') > -1;
}
