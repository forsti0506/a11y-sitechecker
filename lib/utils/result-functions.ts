import {
    A11ySitecheckerResult,
    FullCheckerSingleResult,
    NodeResult,
    ResultsByUrl,
} from '../models/a11y-sitechecker-result';
import { Result } from 'axe-core';

export function setResult(
    violations: FullCheckerSingleResult[],
    violation: Result,
    result: ResultsByUrl,
): FullCheckerSingleResult[] {
    if (violations.filter((v) => v.id === violation.id).length > 0) {
        const reportViolation = violations.filter((v) => v.id === violation.id)[0];
        for (const node of violation.nodes) {
            if (
                reportViolation.nodes.filter(
                    (v) =>
                        v.targetResult.target.length === node.target.length &&
                        v.targetResult.target.every((value, index) => value === node.target[index]),
                ).length > 0
            ) {
                reportViolation.nodes
                    .filter(
                        (v) =>
                            v.targetResult.target.length === node.target.length &&
                            v.targetResult.target.every((value, index) => value === node.target[index]),
                    )[0]
                    .targetResult.urls.push(result.url);
            } else {
                reportViolation.nodes.push({
                    none: node.none,
                    any: node.any,
                    targetResult: { urls: [result.url], target: node.target },
                    all: node.all,
                    html: node.html,
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
            };
            fullCheckerSingleResult.nodes.push(resultViolation);
        }
        violations.push(fullCheckerSingleResult);
    }
    return violations;
}

export function mergeResults(resultsByUrls: ResultsByUrl[], result: A11ySitecheckerResult): A11ySitecheckerResult {
    for (const resultByUrl of resultsByUrls) {
        result.analyzedUrls.push(resultByUrl.url);
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
    return result;
}
