#!/usr/bin/env node

import * as pkg from '../package.json';
import * as commander from 'commander';
import { entry } from '../lib/a11y-sitechecker';

import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';

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

(async (): Promise<void> => {
    if (commander.args[0]) {
        const config = setupConfig(commander);
        const axeConfig = setupAxeConfig(config);
        await entry(config, axeConfig, commander.args[0]);
    }
})();
