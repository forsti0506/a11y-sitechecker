import { LaunchOptions } from 'puppeteer';
import { resultGroups } from 'axe-core';

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
    urlsToAnalyze?: string[];
    clickableItemSelector?: string;
    analyzeClicks?: boolean;
    analyzeClicksWithoutNavigation?: boolean;
    threshold: number;
    timeout: number;
    debugMode: boolean;
    viewports: SitecheckerViewport[];
    resultTypes: resultGroups[];
    db?: Database;
    idTags?: IdTag;
}

interface LoginStep {
    input: Input[];
    submit: string;
}

interface Input {
    selector: string;
    value: string;
}

export interface SitecheckerViewport {
    width: number;
    height: number;
}

interface Database {
    type: string;
    url: string;
    user: string;
    password: string;
}
type IdTag = {
    [axeId: string]: string[];
};
