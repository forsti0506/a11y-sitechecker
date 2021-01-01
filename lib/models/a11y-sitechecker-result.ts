import { ImpactValue, Result, RunOptions, TagValue, TestEngine, TestEnvironment, TestRunner } from 'axe-core';

export interface A11ySitecheckerResult {
    toolOptions: RunOptions;
    testEngine: TestEngine;
    testRunner: TestRunner;
    testEnvironment: TestEnvironment;
    url: string;
    timestamp: string;
    passes: Result[];
    incomplete: Result[];
    inapplicable: Result[];
    violations: FullCheckerSingleResult[];
    violationsByUrl: ResultsByUrl[];
}

interface ResultsByUrl {
    url: string;
    violations: Result[];
}

export interface FullCheckerSingleResult {
    description: string;
    help: string;
    helpUrl: string;
    id: string;
    impact?: ImpactValue;
    tags: TagValue[];
    nodes: NodeResult[];
}
export interface NodeResult {
    html: string;
    impact?: ImpactValue;
    targetResult: TargetResult;
    xpath?: string[];
    ancestry?: string[];
    any: CheckResult[];
    all: CheckResult[];
    none: CheckResult[];
    failureSummary?: string;
    element?: HTMLElement;
}

export interface TargetResult {
    urls: string[];
    target: string[];
}
interface CheckResult {
    id: string;
    impact: string;
    message: string;
    data: unknown;
    relatedNodes?: RelatedNode[];
}
interface RelatedNode {
    target: string[];
    html: string;
}
