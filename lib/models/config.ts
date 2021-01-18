import { LaunchOptions } from 'puppeteer';

export interface Config {
    json: boolean;
    resultsPath: string;
    axeConfig?: {
        locale?: string;
        localePath?: string;
    };
    login?: LoginStep[];
    saveImages?: boolean;
    imagesPath?: string;
    launchOptions?: LaunchOptions;
    ignoreElementAttributeValues?: string[];
}

interface LoginStep {
    input: Input[];
    submit: string;
}

interface Input {
    selector: string;
    value: string;
}
