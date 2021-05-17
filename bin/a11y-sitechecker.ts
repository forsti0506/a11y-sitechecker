#!/usr/bin/env node

// This file is the entry point if you using it throug the command line

import pkg from '../package.json';
import commander from 'commander';
import { entry } from '../lib/a11y-sitechecker';
import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';
import { saveResultsToFile } from '../lib/utils/save-results-to-file';
import { error } from '../lib/utils/helper-functions';


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
    const url = commander.args[0];
    if (url) {
        const config = setupConfig(commander.opts());
        const axeConfig = setupAxeConfig(config);
        let retCode = 0;
        try {
            const results = await entry(config, axeConfig, url);

            for (const [i, sitecheckerResult] of results.entries()) {

                await saveResultsToFile(config, sitecheckerResult, i, url);

                if (sitecheckerResult.violations.length >= config.threshold) {
                    retCode = 2;
                }
            }
        } catch (e) {
            if (e.message.includes('Threshold not met')) {
                retCode = 2;
            } else if (e.message.includes('ERR_NAME_NOT_RESOLVED')) {
                retCode = 3;
            } else {
                retCode = 1;
            }

            error(e);
        }
        process.exit(retCode);
    }
})();
