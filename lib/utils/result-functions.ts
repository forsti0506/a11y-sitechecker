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

export function mergeResults(report: A11ySitecheckerResult): A11ySitecheckerResult {
    for (const result of report.violationsByUrl) {
        for (const violation of result.violations) {
            report.violations = setResult(report.violations, violation, result);
        }
        for (const violation of result.incomplete) {
            report.incomplete = setResult(report.incomplete, violation, result);
        }
        for (const violation of result.inapplicable) {
            report.inapplicable = setResult(report.inapplicable, violation, result);
        }
        for (const violation of result.passes) {
            report.passes = setResult(report.passes, violation, result);
        }
    }
    //set report details to first url (should be always the same)
    report.toolOptions = report.violationsByUrl[0].toolOptions;
    report.testRunner = report.violationsByUrl[0].testRunner;
    report.testEnvironment = report.violationsByUrl[0].testEnvironment;
    report.testEngine = report.violationsByUrl[0].testEngine;
    report.violationsByUrl = null;
    return report;
}
