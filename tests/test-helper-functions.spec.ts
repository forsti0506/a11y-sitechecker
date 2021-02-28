import * as fs from 'fs';
import { Config } from '../lib/models/config';
import { setupConfig } from '../lib/utils/setup-config';
import 'jasmine';

export function cleanUpAfterTest(config: Config): void {
    if (config.imagesPath) {
        fs.rmdirSync(config.imagesPath, { recursive: true });
    }
    if (config.resultsPath) {
        fs.rmdirSync(config.resultsPath, { recursive: true });
    }
}

export function initBeforeTest(): Config {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
    const optionValues = {
        json: true,
        config: './tests/config.json',
    };
    return setupConfig(optionValues);
}
