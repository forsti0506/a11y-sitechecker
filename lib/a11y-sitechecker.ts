import { AxePuppeteer } from '@axe-core/puppeteer';
import { Spec } from 'axe-core';
import { A11ySitecheckerResult, ResultByUrl } from './models/a11y-sitechecker-result';
import * as puppeteer from 'puppeteer';
import { Page } from 'puppeteer';
import { Config } from './models/config';
import {
    debug,
    error,
    getEscaped,
    log,
    saveScreenshot,
    success,
    waitForHTML,
    writeToJsonFile,
} from './utils/helper-functions';
import { getLinks } from './utils/get-links';
import * as chalk from 'chalk';
import { executeLogin } from './utils/login';
import { mergeResults } from './utils/result-functions';
import * as prettyjson from 'prettyjson';
import { prepareWorkspace } from './utils/setup-config';
import { makeScreenshotsWithErrorsBorderd } from './utils/make-sreenshots-with-errors-borderd';
import { markAllTabableItems } from './utils/mark-all-tabable-items';

const alreadyVisited: string[] = [];
const alreadyParsed: string[] = [];
const notCheckedLinks: string[] = [];
const alreadyClicked: Map<string, string[]> = new Map<string, string[]>();
const elementsToClick: Map<string, string[]> = new Map<string, string[]>();
const savedScreenshotHtmls: string[] = [];

const rootDomain = { value: '' };

const resultsByUrl: ResultByUrl[] = [];

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;
    }
}

export async function entry(
    config: Config,
    axeSpecs: Spec,
    url: string,
    expectedReturn?: boolean,
): Promise<A11ySitecheckerResult> {
    try {
        prepareWorkspace(config);
        log(
            chalk.blue('#############################################################################################'),
        );

        log(chalk.blue(`Start accessibility Test for ${url}`));
        log(
            chalk.blue('#############################################################################################'),
        );
        const browser = await puppeteer.launch(config.launchOptions);
        const page = (await browser.pages())[0];
        await page.setViewport({
            width: 1920,
            height: 1080,
        });

        await executeLogin(url, page, config);

        const result: A11ySitecheckerResult = {
            testEngine: undefined,
            testEnvironment: undefined,
            testRunner: undefined,
            timestamp: new Date().toISOString(),
            toolOptions: undefined,
            url: '',
            violations: [],
            inapplicable: [],
            incomplete: [],
            passes: [],
            analyzedUrls: [],
            tabableImages: [],
        };

        const report = await analyzeSite(url, axeSpecs, page, config);
        await browser.close();
        result.url = url;
        mergeResults(report, result);
        if (config.json && !expectedReturn) {
            writeToJsonFile(JSON.stringify(result, null, 2), config.resultsPath);
        } else if (!expectedReturn) {
            log(
                prettyjson.render(report, {
                    keysColor: 'blue',
                    dashColor: 'black',
                    stringColor: 'black',
                }),
            );
        }
        if (result.violations.length >= config.threshold) {
            process.exit(2);
        } else {
            if (expectedReturn) {
                return result;
            } else {
                process.exit(0);
            }
        }
    } catch (err) {
        // Handle any errors
        error(err.message);
        debug(config.debugMode, err.stackTrace);
        throw err;
    }
}

async function setupAxe(page: Page, axeSpecs: Spec): Promise<AxePuppeteer> {
    const axe = new AxePuppeteer(page);
    axe.configure(axeSpecs);
    axe.options({
        runOnly: ['wcag2aa', 'wcag2a', 'wcag21a', 'wcag21aa', 'best-practice', 'ACT', 'experimental'],
    });
    return axe;
}

async function analyzeSite(url: string, axeSpecs: Spec, page: Page, config: Config): Promise<ResultByUrl[]> {
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
            config,
            alreadyParsed,
            rootDomain,
            elementsToClick,
            notCheckedLinks,
            alreadyVisited,
        );

        let i = 1;
        for (const link of links) {
            debug(config.debugMode, 'Visiting ' + i++ + ' of ' + links.length);
            if (!alreadyVisited.includes(link)) {
                await analyzeUrl(page, link, axeSpecs, config);
            }
        }

        debug(config.debugMode, 'All links of ' + url + ' visited. Now Clicking elements');
        await page.goto(url, { waitUntil: 'networkidle2' });
        await waitForHTML(page);

        const elToClick = elementsToClick.get(url);
        if (elToClick && elToClick.length > 0) {
            i = 1;
            for (const element of elToClick) {
                debug(config.debugMode, 'Clicking ' + i++ + ' of ' + elToClick.length);
                if (element && !alreadyClicked.get(url)?.includes(element)) {
                    debug(config.debugMode, 'Element to be clicked: ' + element);
                    try {
                        const alrdyClicked = alreadyClicked.get(url);
                        if (alrdyClicked) {
                            alrdyClicked.push(element);
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
                        await waitForHTML(page);
                        if (page.url() !== url && !alreadyVisited.includes(url)) {
                            await analyzeSite(page.url(), axeSpecs, page, config);
                            await page.goto(url, { waitUntil: 'load' });
                            await waitForHTML(page);
                        } else if (config.analyzeClicksWithoutNavigation) {
                            debug(config.debugMode, 'Experimintal feature! Please check if there are to many clicks!');
                            const axe = await setupAxe(page, axeSpecs);
                            const axeResults = await axe.analyze();
                            await pushResults(url + '_' + element + '_clicked', axeResults, page, config);
                        }
                    }
                }
            }
        }

        i = 1;
        for (const link of links) {
            debug(config.debugMode, 'parsing' + i++ + ' of ' + links.length);
            if (!alreadyParsed.includes(link)) {
                await analyzeSite(link, axeSpecs, page, config);
                debug(config.debugMode, 'Finished analyze of Site: ' + link);
            }
        }
    }
    return resultsByUrl;
}

async function pushResults(url: string, axeResults, page: Page, config: Config): Promise<void> {
    resultsByUrl.push({
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
        tabableImages: [],
    });
    await makeScreenshotsWithErrorsBorderd(
        resultsByUrl.filter((r) => r.url === url)[0],
        page,
        config,
        savedScreenshotHtmls,
    );
    alreadyVisited.push(url);
    success('Finished analyze of url: ' + url + '. Pushed ' + axeResults.violations.length + ' violations');
}

async function analyzeUrl(page, url: string, axeSpecs: Spec, config: Config): Promise<void> {
    if ((await page.url()) !== url) {
        await page.goto(url, { waitUntil: 'load' });
        await waitForHTML(page, 30000, config.debugMode);
    } else {
        debug(config.debugMode, 'URL already open.' + url);
    }
    if (alreadyVisited.includes(url)) {
        debug(config.debugMode, 'Already visited: ' + url);
        return;
    }
    log('Currently analyzing ' + url);

    if (config.saveImages) {
        try {
            await saveScreenshot(page, config.imagesPath, getEscaped(url) + '.png', config.saveImages);
        } catch (e) {
            error(error + '. Image not saved. Analyze not stopped!');
        }
    }

    let axeResults;
    try {
        const axe = await setupAxe(page, axeSpecs);
        axeResults = await axe.analyze();
    } catch (e) {
        error(error + '. Error Axe');
    }
    if (axeResults) {
        await pushResults(url, axeResults, page, config);
    }
    await markAllTabableItems(page, url, config, resultsByUrl);
}
