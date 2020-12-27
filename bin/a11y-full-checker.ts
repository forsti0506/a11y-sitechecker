#!/usr/bin/env node

import * as pkg from '../package.json';
import {analyzeSite} from '../lib/a11y-full-checker';
import * as commander from 'commander';
import * as chalk from 'chalk';

// Here we're using Commander to specify the CLI options
commander
    .version(pkg.version)
    .usage('[options] <paths>')
    .option(
        '-j, --json',
        'Output results as JSON'
    )
    .option(
        '-T, --threshold <number>',
        'permit this number of errors, warnings, or notices, otherwise fail with exit code 2',
        '0'
    )
    .parse(process.argv);

// Start the promise chain to actually run everything
Promise.resolve()
    .then(config => {
        console.log(chalk.blue('#############################################################################################'));
        console.log(chalk.blue(`Start accessibility Test for ${commander.args[0]}`));
        console.log(chalk.blue('#############################################################################################'));
        return analyzeSite(commander.args[0]);
    })
    .then(report => {
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
