import * as fs from 'fs';
import { Config } from '../lib/models/config';
import { setupConfig } from '../lib/utils/setup-config';
import 'jasmine';

export async function cleanUpAfterTest(config: Config): Promise<void> {
    if (config.imagesPath) {
        fs.rmdirSync(config.imagesPath, { recursive: true });
    }
    if (config.resultsPath) {
        fs.rmdirSync(config.resultsPath, { recursive: true });
    }
}

export async function initBeforeTest(): Promise<Config> {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 500000;
    const optionValues = {
        json: true,
        config: './tests/config.json',
    };
    return setupConfig(optionValues);
}
