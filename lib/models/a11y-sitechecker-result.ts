import { ImpactValue, RunOptions, TagValue, TestEngine, TestEnvironment, TestRunner } from 'axe-core';
import { KeyboardAccessPerUrl } from './site-result';

export interface A11ySitecheckerResult {
    toolOptions: RunOptions | undefined;
    testEngine: TestEngine | undefined;
    testRunner: TestRunner | undefined;
    testEnvironment: TestEnvironment | undefined;
    timestamp: string;
    passes: FullCheckerSingleResult[];
    incomplete: FullCheckerSingleResult[];
    inapplicable: FullCheckerSingleResult[];
    violations: FullCheckerSingleResult[];
    analyzedUrls: string[];
    tabables: KeyboardAccessPerUrl[];
    usedLocale: string;
    name: string;
}

export interface ResultByUrl {
    url: string;
    violations: Result[];
    toolOptions: RunOptions;
    testEngine: TestEngine;
    testRunner: TestRunner;
    testEnvironment: TestEnvironment;
    timestamp: string;
    passes: Result[];
    incomplete: Result[];
    inapplicable: Result[];
    tabableImages: string[];
    keyboardAccessibles: string[];
    needsCheck: string[];
    notFocusableClickables: string[];
}

export interface Result {
    description: string;
    help: string;
    helpUrl: string;
    id: string;
    impact?: ImpactValue;
    tags: TagValue[];
    nodes: AxeNodeResult[];
}

interface AxeNodeResult {
    html: string;
    impact?: ImpactValue;
    target: string[];
    xpath?: string[];
    ancestry?: string[];
    any: CheckResult[];
    all: CheckResult[];
    none: CheckResult[];
    failureSummary?: string;
    element?: HTMLElement;
    image?: string;
}

export interface FullCheckerSingleResult {
    description: string;
    help: string;
    helpUrl: string;
    id: string;
    impact?: ImpactValue;
    tags: TagValue[];
    customTags?: string[];
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
    image: string | undefined;
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
