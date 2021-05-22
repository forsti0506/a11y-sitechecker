import { LaunchOptions } from 'puppeteer';
import { resultGroups, RunOnly, TagValue } from 'axe-core';

export interface Config {
    json: boolean;
    resultsPath: string;
    resultsPathPerUrl: string;
    axeConfig?: AxeConfig;
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
    idTags?: IdTag;
    runOnly: RunOnly | TagValue[] | string[];
}

interface AxeConfig {
    locale?: string;
    localePath?: string;
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

type IdTag = {
    [axeId: string]: string[];
};
