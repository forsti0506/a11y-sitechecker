import { BrowserLaunchArgumentOptions } from 'puppeteer';
import { resultGroups, RunOnly, TagValue } from 'axe-core';

export interface Config {
    json: boolean;
    resultsPath: string;
    resultsPathPerUrl: string;
    axeConfig?: AxeConfig;
    login?: Login;
    saveImages?: boolean;
    imagesPath?: string;
    launchOptions?: BrowserLaunchArgumentOptions;
    ignoreElementAttributeValues?: string[];
    urlsToAnalyze: string[];
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
    crawl: boolean;
    name: string;
    cookieText?: string;
    cookieSelector?: string;
    screenshotPadding?: number;
}

interface AxeConfig {
    locale?: string;
    localePath?: string;
}
interface Login {
    url?: string;
    steps: LoginStep[];
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
