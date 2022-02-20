import { RunOptions, TestEngine, TestEnvironment, TestRunner } from 'axe-core';
export interface SiteResult {
    id: string;
    name: string;
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
    tabables: KeyboardAccessPerUrl[];
}

export interface KeyboardAccessPerUrl {
    url: string;
    keyboardAccessibles: string[];
    needsCheck: string[];
    notFocusableClickables: string[];
    images: string[];
}
