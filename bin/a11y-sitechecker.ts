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
import { config, setupConfig } from '../lib/utils/setup-config';

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
    const axeConfig = setupConfig();
    await next(axeConfig);
})();

async function next(axeSpecs: Spec): Promise<void> {
    try {
        log(
            chalk.blue('#############################################################################################'),
        );

        log(chalk.blue(`Start accessibility Test for ${commander.args[0]}`));
        log(
            chalk.blue('#############################################################################################'),
        );
        const browser = await puppeteer.launch(config.launchOptions);
        const page = (await browser.pages())[0];
        await page.setViewport({
            width: 1920,
            height: 1080,
        });

        await executeLogin(commander.args[0], page, config);
        /* istanbul ignore next */
        let report = await analyzeSite(commander.args[0], axeSpecs, page, config);
        await browser.close();
        report.url = commander.args[0];
        report = mergeResults(report);
        if (config.json) {
            writeToJsonFile(JSON.stringify(report, null, 2), config.resultsPath);
        } else {
            log(
                prettyjson.render(report, {
                    keysColor: 'blue',
                    dashColor: 'black',
                    stringColor: 'black',
                }),
            );
        }
        if (report.violations.length >= parseInt(commander.threshold, 10)) {
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
