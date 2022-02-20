import { A11ySitecheckerResult } from '../models/a11y-sitechecker-result';
import { SiteResult } from '../models/site-result';

export function setupSiteresult(id: string, sitecheckerResult: A11ySitecheckerResult): SiteResult {
    return {
        id: id,
        name: sitecheckerResult.name,
        toolOptions: sitecheckerResult.toolOptions,
        testEngine: sitecheckerResult.testEngine,
        testRunner: sitecheckerResult.testRunner,
        testEnvironment: sitecheckerResult.testEnvironment,
        timestamp: sitecheckerResult.timestamp,
        analyzedUrls: sitecheckerResult.analyzedUrls,
        countViolations: sitecheckerResult.violations
            .map((v) => v.nodes.length)
            .reduce((count, value) => count + value, 0),
        countPasses: sitecheckerResult.passes.map((v) => v.nodes.length).reduce((count, value) => count + value, 0),
        countIncomplete: sitecheckerResult.incomplete
            .map((v) => v.nodes.length)
            .reduce((count, value) => count + value, 0),
        countInapplicable: sitecheckerResult.inapplicable.length,
        tabables: sitecheckerResult.tabables,
    };
}
