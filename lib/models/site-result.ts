import { RunOptions, TestEngine, TestEnvironment, TestRunner } from 'axe-core';
export interface SiteResult {
    id: string;
    toolOptions: RunOptions | undefined;
    testEngine: TestEngine | undefined;
    testRunner: TestRunner | undefined;
    testEnvironment: TestEnvironment | undefined;
    timestamp: string;
    analyzedUrls: string[];
    countViolations: number;
    countPasses: number;
    countIncomplete: number;
    countInapplicable: number;
    tabableImages: UrlWithTabableImages[];
}

interface UrlWithTabableImages {
    url: string;
    images: string[];
}
