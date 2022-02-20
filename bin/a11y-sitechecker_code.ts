#!/usr/bin/env node

// This file is the entry point if you are using it through the command line

import { program } from 'commander';
import { entry } from '../lib/a11y-sitechecker';
import { error } from '../lib/utils/helper-functions';
import { saveResultsToFile } from '../lib/utils/save-results-to-file';
import { setupAxeConfig, setupConfig } from '../lib/utils/setup-config';
import pkg from '../package.json';

export const defaultFunction = async (): Promise<void> => {
    program
        .version(pkg.version)
        .usage('[options] <paths>')
        .option('-j, --json', 'Output results as JSON. Otherwise output is displayed on the console', false)
        .option('--config <string>', 'Provide a config.json')
        .option(
            '-T, --threshold <number>',
            'permit this number of errors, warnings, or notices, otherwise fail with exit code 2',
            '0',
        )
        .parse(process.argv);

    const config = setupConfig(program.opts());
    const axeConfig = setupAxeConfig(config);
    let retCode = 0;
    try {
        const results = await entry(config, axeConfig, !program.opts().json);

        for (const [i, sitecheckerResult] of results.entries()) {
            await saveResultsToFile(config, sitecheckerResult, i);
            if (sitecheckerResult.violations.length >= config.threshold) {
                retCode = 2;
            }
        }
    } catch (e: any) {
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
};
