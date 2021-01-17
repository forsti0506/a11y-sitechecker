#!/usr/bin/env node

import * as pkg from '../package.json';
import * as commander from 'commander';
import * as chalk from 'chalk';
import { Config } from '../lib/models/config';
import * as fs from 'fs';
import * as prettyjson from 'prettyjson';
import {
    A11ySitecheckerResult,
    FullCheckerSingleResult,
    NodeResult,
    ResultsByUrl,
} from '../lib/models/a11y-sitechecker-result';
import { analyzeSite } from '../lib/a11y-sitechecker';
import { Result, Spec } from 'axe-core';
import * as puppeteer from 'puppeteer';
import { Page } from 'puppeteer';

const config: Config = { json: true, resultsPath: 'results', axeConfig: {} };

// Here we're using Commander to specify the CLI options
commander
    .version(pkg.version)
    .usage('[options] <paths>')
    .option('-j, --json', 'Output results as JSON')
    .option('--config <string>', 'Provide a config.json')
    .option(
        '-T, --threshold <number>',
        'permit this number of errors, warnings, or notices, otherwise fail with exit code 2',
        '0',
    )
    .parse(process.argv);

function writeToJsonFile(data: string, path: string): void {
    console.log(
        chalk.blue('#############################################################################################'),
    );
    console.log(chalk.blue(`Writing results to ${path}/results.json`));
    console.log(
        chalk.blue('#############################################################################################'),
    );
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
    fs.writeFileSync(path + '/results.json', data);
}

function setResult(
    violations: FullCheckerSingleResult[],
    violation: Result,
    result: ResultsByUrl,
): FullCheckerSingleResult[] {
    if (violations.filter((v) => v.id === violation.id).length > 0) {
        const reportViolation = violations.filter((v) => v.id === violation.id)[0];
        for (const node of violation.nodes) {
            if (
                reportViolation.nodes.filter(
                    (v) =>
                        v.targetResult.target.length === node.target.length &&
                        v.targetResult.target.every((value, index) => value === node.target[index]),
                ).length > 0
            ) {
                reportViolation.nodes
                    .filter(
                        (v) =>
                            v.targetResult.target.length === node.target.length &&
                            v.targetResult.target.every((value, index) => value === node.target[index]),
                    )[0]
                    .targetResult.urls.push(result.url);
            } else {
                reportViolation.nodes.push({
                    none: node.none,
                    any: node.any,
                    targetResult: { urls: [result.url], target: node.target },
                    all: node.all,
                    html: node.html,
                });
            }
        }
    } else {
        const fullCheckerSingleResult: FullCheckerSingleResult = {
            help: violation.help,
            description: violation.description,
            helpUrl: violation.helpUrl,
            id: violation.id,
            impact: violation.impact,
            tags: violation.tags,
            nodes: [],
        };

        for (const node of violation.nodes) {
            const resultViolation: NodeResult = {
                html: node.html,
                all: node.all,
                any: node.any,
                none: node.none,
                targetResult: { urls: [result.url], target: JSON.parse(JSON.stringify(node.target)) },
            };
            fullCheckerSingleResult.nodes.push(resultViolation);
        }
        violations.push(fullCheckerSingleResult);
    }
    return violations;
}

function mergeResults(report: A11ySitecheckerResult): A11ySitecheckerResult {
    for (const result of report.violationsByUrl) {
        for (const violation of result.violations) {
            report.violations = setResult(report.violations, violation, result);
        }
        for (const violation of result.incomplete) {
            report.incomplete = setResult(report.incomplete, violation, result);
        }
        for (const violation of result.inapplicable) {
            report.inapplicable = setResult(report.inapplicable, violation, result);
        }
        for (const violation of result.passes) {
            report.passes = setResult(report.passes, violation, result);
        }
    }
    //set report details to first url (should be always the same)
    report.toolOptions = report.violationsByUrl[0].toolOptions;
    report.testRunner = report.violationsByUrl[0].testRunner;
    report.testEnvironment = report.violationsByUrl[0].testEnvironment;
    report.testEngine = report.violationsByUrl[0].testEngine;
    return report;
}

(async (): Promise<void> => {
    config.json = commander.json;
    if (commander.config) {
        const configFile = JSON.parse(fs.readFileSync(commander.config).toString('utf-8'));
        if (configFile.json && configFile.json && typeof configFile.json === 'boolean') {
            config.json = configFile.json;
        }
        if (configFile.resultsPath && typeof configFile.resultsPath === 'string') {
            config.resultsPath = configFile.resultsPath;
        }
        if (configFile.axeConfig.locale && typeof configFile.axeConfig.locale === 'string') {
            config.axeConfig.locale = configFile.axeConfig.locale;
        }
        if (configFile.axeConfig.localePath && typeof configFile.axeConfig.localePath === 'string') {
            config.axeConfig.localePath = configFile.axeConfig.localePath;
        }
        if (configFile.login) {
            config.login = configFile.login;
        }
        if (configFile.launchOptions) {
            config.launchOptions = configFile.launchOptions;
        }
    }
    const axeConfig: Spec = {};
    if (config.axeConfig?.locale) {
        axeConfig.locale = JSON.parse(
            fs.readFileSync('node_modules/axe-core/locales/' + config.axeConfig.locale + '.json').toString('utf-8'),
        );
    } else if (config.axeConfig?.localePath) {
        axeConfig.locale = JSON.parse(fs.readFileSync(config.axeConfig.localePath).toString('utf-8'));
    }
    await next(axeConfig);
})();

async function next(axeSpecs: Spec): Promise<void> {
    try {
        console.log(
            chalk.blue('#############################################################################################'),
        );

        console.log(chalk.blue(`Start accessibility Test for ${commander.args[0]}`));
        console.log(
            chalk.blue('#############################################################################################'),
        );
        const browser = await puppeteer.launch(config.launchOptions);
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
        });

        await executeLogin(commander.args[0], page);

        let report = await analyzeSite(commander.args[0], axeSpecs, page, config);
        await browser.close();
        report.url = commander.args[0];
        report = mergeResults(report);
        if (config.json) {
            writeToJsonFile(JSON.stringify(report, null, 2), config.resultsPath);
        } else {
            console.log(
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

async function executeLogin(url: string, page: Page): Promise<void> {
    if (!config.login) {
        return;
    }
    await page.goto(url, { waitUntil: 'networkidle2' });
    // await page.waitForNavigation({ waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'images/yeah.png' });
    for (const step of config.login) {
        for (const input of step.input) {
            await page.waitForSelector(input.selector);
            await page.type(input.selector, input.value);
            await page.screenshot({ path: 'images/yeah.png' });
        }
        await page.click(step.submit);
    }
    await page.screenshot({ path: 'images/login.png' });
    try {
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await page.screenshot({ path: 'images/lopin2.png' });
    } catch (e) {
        // eslint-disable-next-line prettier/prettier
        console.log(chalk.red('No Navigation after Login. Please check if it\'s working as expected!'));
    }
}
