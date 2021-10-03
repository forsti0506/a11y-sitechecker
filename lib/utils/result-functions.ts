import {
    A11ySitecheckerResult,
    FullCheckerSingleResult,
    NodeResult,
    Result,
    ResultByUrl,
} from '../models/a11y-sitechecker-result';

function setResult(
    violations: FullCheckerSingleResult[],
    violation: Result,
    result: ResultByUrl,
): FullCheckerSingleResult[] {
    if (violations.filter((v) => v.id === violation.id).length > 0) {
        const reportViolation = violations.filter((v) => v.id === violation.id)[0];
        for (const node of violation.nodes) {
            if (reportViolation.nodes.filter((v) => v.html === node.html).length > 0) {
                reportViolation.nodes.filter((v) => v.html === node.html)[0].targetResult.urls.push(result.url);
            } else {
                reportViolation.nodes.push({
                    none: node.none,
                    any: node.any,
                    targetResult: { urls: [result.url], target: node.target },
                    all: node.all,
                    html: node.html,
                    image: node.image,
                });
            }
        }
    } else {
        const fullCheckerSingleResult: FullCheckerSingleResult = {
            help: violation.help,
            description: violation.description,
            helpUrl: violation.helpUrl,
            id: violation.id,
            impact: violation.impact,
            tags: violation.tags,
            nodes: [],
        };

        for (const node of violation.nodes) {
            const resultViolation: NodeResult = {
                html: node.html,
                all: node.all,
                any: node.any,
                none: node.none,
                targetResult: { urls: [result.url], target: JSON.parse(JSON.stringify(node.target)) },
                image: node.image,
            };
            fullCheckerSingleResult.nodes.push(resultViolation);
        }
        violations.push(fullCheckerSingleResult);
    }
    return violations;
}

export function mergeResults(resultsByUrls: ResultByUrl[], result: A11ySitecheckerResult): void {
    for (const resultByUrl of resultsByUrls) {
        result.analyzedUrls.push(resultByUrl.url);
        result.tabableImages.push({ url: resultByUrl.url, images: resultByUrl.tabableImages });
        for (const violation of resultByUrl.violations) {
            result.violations = setResult(result.violations, violation, resultByUrl);
        }
        for (const violation of resultByUrl.incomplete) {
            result.incomplete = setResult(result.incomplete, violation, resultByUrl);
        }
        for (const violation of resultByUrl.inapplicable) {
            result.inapplicable = setResult(result.inapplicable, violation, resultByUrl);
        }
        for (const violation of resultByUrl.passes) {
            result.passes = setResult(result.passes, violation, resultByUrl);
        }
    }
    //set report details to first url (should be always the same)
    result.toolOptions = resultsByUrls[0].toolOptions;
    result.testRunner = resultsByUrls[0].testRunner;
    result.testEnvironment = resultsByUrls[0].testEnvironment;
    result.testEngine = resultsByUrls[0].testEngine;
}
