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
    const optionValues = {
        json: true,
        config: './tests/config.json',
        debugMode: false,
        launchOptions: {
            devtools: true,
            headless: false,
        },
    };
    return setupConfig(optionValues);
}

test.skip('Workaround', () => void 0);
