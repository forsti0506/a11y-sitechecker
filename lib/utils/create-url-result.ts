import { success } from './helper-functions';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { AxeResults } from 'axe-core';

export async function createUrlResult(url: string, axeResults: AxeResults): Promise<ResultByUrl> {
    success('Finished analyze of url: ' + url + '. Pushed ' + axeResults.violations.length + ' violations');
    return {
        url: url,
        violations: axeResults.violations,
        passes: axeResults.passes,
        inapplicable: axeResults.inapplicable,
        incomplete: axeResults.incomplete,
        testEngine: axeResults.testEngine,
        testEnvironment: axeResults.testEnvironment,
        testRunner: axeResults.testRunner,
        timestamp: axeResults.timestamp,
        toolOptions: axeResults.toolOptions,
        tabableImages: [],
    };
}
