import { Spec } from 'axe-core';
import { A11ySitecheckerResult } from './models/a11y-sitechecker-result';
import puppeteer from 'puppeteer';
import { Config, SitecheckerViewport } from './models/config';
import { debug, error, log, writeToJsonFile } from './utils/helper-functions';
import chalk from 'chalk';
import { executeLogin } from './utils/login';
import { mergeResults } from './utils/result-functions';
import { prepareWorkspace } from './utils/setup-config';
import { analyzeSite } from './utils/analyze-site';


export async function entry(
    config: Config,
    axeSpecs: Spec,
    onlyReturn?: boolean,
): Promise<A11ySitecheckerResult[]> {
    try {
        prepareWorkspace(config);
        log(
            chalk.blue('#############################################################################################'),
        );
        log(chalk.blue(`Start accessibility Test for ${config.name}`));
        log(
            chalk.blue('#############################################################################################'),
        );
        const promises: Promise<A11ySitecheckerResult>[] = [];
        config.viewports.forEach((viewport) => promises.push(checkSite(config, axeSpecs, viewport, onlyReturn)));
        return Promise.all(promises);
    } catch (err) {
        // Handle any errors
        error(err.message);
        debug(config.debugMode, err.stackTrace);
        throw err;
    }
}

async function checkSite(
    config: Config,
    axeSpecs: Spec,
    vp: SitecheckerViewport,
    onlyReturn?: boolean,
): Promise<A11ySitecheckerResult> {
    const browser = await puppeteer.launch(config.launchOptions);
    const page = (await browser.pages())[0];
    await page.setViewport({
        width: vp.width,
        height: vp.height,
    });
    await executeLogin( page, config);
    const usedLocale = config.axeConfig?.locale ? config.axeConfig?.locale : (config.axeConfig?.localePath ? config.axeConfig?.localePath : 'en')

    const result: A11ySitecheckerResult = {
        testEngine: undefined,
        testEnvironment: undefined,
        testRunner: undefined,
        timestamp: new Date().toISOString(),
        toolOptions: undefined,
        name: '',
        violations: [],
        inapplicable: [],
        incomplete: [],
        passes: [],
        analyzedUrls: [],
        tabableImages: [],
        usedLocale: usedLocale,
    };

    const alreadyVisited: Map<string, SitecheckerViewport> = new Map<string, SitecheckerViewport>();
    const report = await analyzeSite(axeSpecs, page, config, [], browser, alreadyVisited, [], []);

    await browser.close();
    result.name = config.name;

    mergeResults(report, result);
    if (result.violations.length > config.threshold) {
        throw new Error(
            'Threshold not met. There are ' + result.violations.length + 'errors. Threshold was: ' + config.threshold,
        );
    }
    if (config.json) {
        writeToJsonFile(JSON.stringify(result, null, 2), config.resultsPathPerUrl, vp);
    } else if (!onlyReturn) {
        log(JSON.stringify(report, null, 4));
    }
    return result;
}
