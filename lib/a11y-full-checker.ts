import {FullCheckerResult} from './models/full-checker-result';
import * as fs from 'fs';
import {AxePuppeteer} from '@axe-core/puppeteer';
import * as chalk from 'chalk';
import * as puppeteer from 'puppeteer';
import * as JSDOM from 'jsdom';

const alreadyVisited = [];
const alreadyParsed = [];
const notCheckedLinks = [];

const log = console.log;

let results: FullCheckerResult = {violations: [], violationsByUrl: []};

function getEscaped(link: string): string {
    return link.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}\\[\]/]/gi, '_');
}

export async function analyzeSite(url: string): Promise<FullCheckerResult> {
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

    await analyzeUrl(page, url);
    const html = await page.content();
    const links = getLinks(html, url);

    for (const link of links) {
        if (!alreadyVisited.includes(link)) {
            await analyzeUrl(page, link, url);
        }
    }
    await browser.close();
    let count = 0;
    for (const link of links) {
        if (count >= 1) break;
        if (!alreadyParsed.includes(link)) {
            const res: FullCheckerResult = await analyzeSite(link);
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
    let rootDomain = url.split('.').reverse().splice(0, 2).reverse().join('.');
    if (rootDomain.includes('/')) {
        rootDomain = rootDomain.substr(0, rootDomain.indexOf('/'));
    }
    dom.window.document.querySelectorAll('a').forEach(
        (element: HTMLAnchorElement) => {
            let link = element.href;
            if (isAbsoluteUrl(link) && link.includes(rootDomain)) {
                if (link.startsWith('//')) {
                    link = url.startsWith('https') ? 'https:' + link : 'http:' + link;
                }
                if (!link.endsWith('/') && !link.includes('#')) {
                    link = link + '/';
                }
                if (!links.includes(link)) {
                    links.push(link);
                }
            } else if (!isAbsoluteUrl(link) && !link.includes('#')) {
                let absoluteUrl = url + '/' + link;
                if (!absoluteUrl.endsWith('/')) {
                    absoluteUrl = absoluteUrl + '/';
                }
                if (!links.includes(absoluteUrl)) {
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

async function analyzeUrl(page, url: string, backUrl?: string): Promise<void> {
    log(chalk.blue('Currently analyzing ' + url + '...'));
    await page.goto(url, {waitUntil: 'networkidle2'});
    if (!fs.existsSync('images')) {
        fs.mkdirSync('images');
    }
    await page.screenshot({path: 'images/' + getEscaped(url) + '.png'});
    alreadyParsed.push(url);
    try {
        const axeResults = await new AxePuppeteer(page).analyze();
        results.violations = {...results.violations, ...axeResults.violations};
        results.violationsByUrl.push({url: url, violations: axeResults.violations});
        alreadyVisited.push(url);
        log(chalk.green('Finished analyze of url.'));
    } catch (error) {
        log(chalk.red( error + '.np Analyze not stopped.'));
    }
    if(backUrl) {
        await page.goto(backUrl, {waitUntil: 'networkidle2'});
    }
}
