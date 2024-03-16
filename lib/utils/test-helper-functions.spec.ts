import { rmSync, existsSync } from 'fs';
import { Config } from '../models/config';
import { setupConfig } from './setup-config';

export async function cleanUpAfterTest(config: Config): Promise<void> {
    if (config.imagesPath && existsSync(config.imagesPath)) {
        rmSync(config.imagesPath, { recursive: true });
    }
    if (config.resultsPath && existsSync(config.resultsPath)) {
        rmSync(config.resultsPath, { recursive: true });
    }
}

export const optionValues = {
    json: true,
    config: './tests/config.json',
    debugMode: false,
    launchOptions: {
        devtools: true,
        headless: false,
    },
};

export async function initBeforeTest(): Promise<Config> {
    return setupConfig(optionValues);
}

test.skip('Workaround', () => void 0);
