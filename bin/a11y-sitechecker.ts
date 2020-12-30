#!/usr/bin/env node

import * as pkg from '../package.json';
import * as commander from 'commander';
import * as chalk from 'chalk';
import {Config} from '../lib/models/config';
import * as fs from 'fs';
import * as prettyjson from 'prettyjson';
import {A11ySitecheckerResult, FullCheckerSingleResult, NodeResult} from '../lib/models/a11y-sitechecker-result';
import {analyzeSite} from '../lib/a11y-sitechecker';


const config: Config = {json: false, resultsPath: 'results'};

// Here we're using Commander to specify the CLI options
commander
    .version(pkg.version)
    .usage('[options] <paths>')
    .option(
        '-j, --json',
        'Output results as JSON'
    )
    .option(
        '--config <string>',
        'Provide a config.json. Relative Path from your main folder'
    )
    .option(
        '-T, --threshold <number>',
        'permit this number of errors, warnings, or notices, otherwise fail with exit code 2',
        '0'
    )
    .parse(process.argv);

function writeToJsonFile(data: string, path: string): void {
    console.log(chalk.blue('#############################################################################################'));
    console.log(chalk.blue(`Writing results to ${path}/results.json`));
    console.log(chalk.blue('#############################################################################################'));
    if (!fs.existsSync('results')) {
        fs.mkdirSync('results');
    }
    fs.writeFileSync(path + '/results.json', data);
}

function mergeResults(report: A11ySitecheckerResult): A11ySitecheckerResult {
    for(const result of report.violationsByUrl) {
        for(const violation of result.violations) {
            if(report.violations.filter(v=>v.id === violation.id).length > 0) {
                const reportViolation = report.violations.filter(v=>v.id === violation.id)[0];
                for (const node of violation.nodes) {
                    if(reportViolation.nodes.filter(v=> v.targetResult.target.length === node.target.length &&
                        v.targetResult.target.every(((value, index) => value === node.target[index]))).length > 0) {
                        reportViolation.nodes.filter(v=> v.targetResult.target.length === node.target.length &&
                            v.targetResult.target.every(((value, index) => value === node.target[index])))[0].targetResult.urls.push(result.url);
                    } else {
                        reportViolation.nodes.push({none: node.none, any: node.any, targetResult: {urls: [result.url], target: node.target}, all: node.all, html: node.html});
                    }

                    console.log('it is pushed');
                }
            } else {
                const fullCheckerSingleResult: FullCheckerSingleResult = {help: violation.help, description: violation.description, helpUrl: violation.helpUrl, id: violation.id
                , impact: violation.impact, tags: violation.tags, nodes: []};

                for(const node of violation.nodes) {
                    const resultViolation: NodeResult = {html: node.html, all: node.all, any: node.any, none: node.none,
                        targetResult: {urls: [result.url], target: (JSON.parse(JSON.stringify(node.target)))}};
                    fullCheckerSingleResult.nodes.push(resultViolation);
                }
                report.violations.push(fullCheckerSingleResult);
            }
        }
    }
    return report;
}

// Start the promise chain to actually run everything
Promise.resolve()
    .then(() => {
        config.json = commander.json;
        if(commander.config) {
            const configFile = JSON.parse(fs.readFileSync(commander.config).toString('utf-8'));
            if(configFile.json && configFile.json && typeof configFile.json === 'boolean') {
                config.json = configFile.json;
            }
            if(configFile.resultsPath && configFile.resultsPath && typeof configFile.resultsPath === 'string') {
                config.resultsPath = configFile.resultsPath;
            }
        }

    })
    .then(() => {
        console.log(chalk.blue('#############################################################################################'));
        console.log(chalk.blue(`Start accessibility Test for ${commander.args[0]}`));
        console.log(chalk.blue('#############################################################################################'));
        return analyzeSite(commander.args[0]);
    })
    .then(report => {
        report = mergeResults(report);
        if(config.json) {
            writeToJsonFile(JSON.stringify(report, null, 2), config.resultsPath);
        } else {
            console.log(prettyjson.render(report, {
                keysColor: 'blue',
                dashColor: 'black',
                stringColor: 'black'
            }));
        }
        if (report.violations.length >= parseInt(commander.threshold, 10)) {
            process.exit(2);
        } else {
            process.exit(0);
        }
    })
    .catch(error => {
        // Handle any errors
        console.error(error.message);
        process.exit(1);
    });
