import fs from 'fs';
import { Config } from '../models/config';
import { setupConfig } from './setup-config';

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
        debugMode: false
    };
    return setupConfig(optionValues);
}
