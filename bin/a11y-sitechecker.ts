#!/usr/bin/env node

import * as pkg from '../package.json';
import * as commander from 'commander';
import * as chalk from 'chalk';
import * as fs from 'fs';
import * as prettyjson from 'prettyjson';
import { analyzeSite } from '../lib/a11y-sitechecker';
import { Spec } from 'axe-core';
import * as puppeteer from 'puppeteer';
import { executeLogin } from '../lib/utils/login';
import { mergeResults } from '../lib/utils/result-functions';
import { log } from '../lib/utils/helper-functions';
import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';
import { Config } from '../lib/models/config';
import { A11ySitecheckerResult } from '../lib/models/a11y-sitechecker-result';

// Here we're using Commander to specify the CLI options
commander
    .version(pkg.version)
    .usage('[options] <paths>')
    .option('-j, --json', 'Output results as JSON. Otherwise output is displayed on the console')
    .option('--config <string>', 'Provide a config.json')
    .option(
        '-T, --threshold <number>',
        'permit this number of errors, warnings, or notices, otherwise fail with exit code 2',
        '0',
    )
    .parse(process.argv);

function writeToJsonFile(data: string, path: string): void {
    log(chalk.blue('#############################################################################################'));
    log(chalk.blue(`Writing results to ${path}/results.json`));
    log(chalk.blue('#############################################################################################'));
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    fs.writeFileSync(path + '/results.json', data);
}

(async (): Promise<void> => {
    if (commander.args[0]) {
        const config = setupConfig(commander);
        const axeConfig = setupAxeConfig(config);
        await next(config, axeConfig, commander.args[0]);
    }
})();

export async function next(config: Config, axeSpecs: Spec, url: string): Promise<void> {
    try {
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
        };

        /* istanbul ignore next */
        const report = await analyzeSite(url, axeSpecs, page, config);
        await browser.close();
        result.url = url;
        mergeResults(report, result);
        if (config.json) {
            writeToJsonFile(JSON.stringify(result, null, 2), config.resultsPath);
        } else {
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
            process.exit(0);
        }
    } catch (error) {
        // Handle any errors
        console.error(error.message);
        console.error(error.stackTrace);
        process.exit(1);
    }
}
