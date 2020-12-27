import {Result} from 'axe-core';

export interface FullCheckerResult {
    violations: Result[];
    violationsByUrl: ResultsByUrl[];
}

interface ResultsByUrl {
    url: string;
    violations: Result[];
}
