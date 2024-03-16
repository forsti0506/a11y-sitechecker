import { jest } from '@jest/globals';
import { A11ySitecheckerResult, FullCheckerSingleResult } from './models/a11y-sitechecker-result';

let mergeResultsRetValue: A11ySitecheckerResult | undefined = {
    violations: [{} as FullCheckerSingleResult],
} as A11ySitecheckerResult;
jest.unstable_mockModule('./utils/setup-config', () => ({
    prepareWorkspace: jest.fn().mockImplementation(() => void 0),
}));

jest.unstable_mockModule('./utils/analyze-site.js', () => ({
    analyzeSite: jest.fn().mockImplementation(() => new Promise((resolve) => resolve([]))),
}));

jest.unstable_mockModule('./utils/result-functions', () => ({
    mergeResults: jest.fn().mockImplementation((report: unknown, result: unknown) => {
        if (mergeResultsRetValue) return mergeResultsRetValue;
        return result;
    }),
}));

jest.unstable_mockModule('./utils/helper-functions', () => ({
    writeToJsonFile: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    waitForHTML: jest.fn(),
}));

import { Config } from './models/config';

describe('a11y-sitechecker', () => {
    test('Error on empty config', async () => {
        const mockConfig: Partial<Config> = {};
        const a11y = await import('./a11y-sitechecker.js');
        expect(async () => await a11y.entry(mockConfig as Config, {})).toThrowError;
    });

    test('1 result with name set', async () => {
        mergeResultsRetValue = undefined;
        const mockConfig: Partial<Config> = {};
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{ width: 100, height: 200 }];
        mockConfig.json = false;
        const a11y = await import('./a11y-sitechecker.js');
        const results = await a11y.entry(mockConfig as Config, {});
        expect(results[0].name).toBe('Testinger');
        expect(results.length).toBe(1);
    });

    test('Threshold not met', async () => {
        mergeResultsRetValue = { violations: [{} as FullCheckerSingleResult] } as A11ySitecheckerResult;
        // jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        // jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(
        //     () => new Promise((resolve) => resolve(mockedResults as ResultByUrl[])),
        // );
        // jest.spyOn(mergeResults, 'mergeResults').mockImplementation((result, report) => {
        //     report.violations = [violation as FullCheckerSingleResult];
        // });

        const a11y = await import('./a11y-sitechecker.js');
        const mockConfig: Partial<Config> = {};
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{ width: 100, height: 200 }];
        mockConfig.json = false;
        mockConfig.threshold = 0;
        mockConfig.login = undefined;

        return a11y
            .entry(mockConfig as Config, {})
            .then((e) => expect(e.length).toBe(10))
            .catch((e) => expect(e.message).toContain('Threshold (0) not met'));
    });
    test('Threshold met', async () => {
        // const mockedResults: Partial<ResultByUrl>[] = [];
        // const violation: Partial<FullCheckerSingleResult> = {};
        // jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        // jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(
        //     () => new Promise((resolve) => resolve(mockedResults as ResultByUrl[])),
        // );
        // jest.spyOn(mergeResults, 'mergeResults').mockImplementation((result, report) => {
        //     report.violations = [violation as FullCheckerSingleResult];
        // });
        const mockConfig: Partial<Config> = {};
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{ width: 100, height: 200 }];
        mockConfig.json = false;
        mockConfig.threshold = 2;
        mockConfig.login = undefined;
        const a11y = await import('./a11y-sitechecker.js');
        return a11y.entry(mockConfig as Config, {}).then((e) => expect(e.length).toBe(1));
    });

    test('Write to JSON File', async () => {
        // const mockedResults: Partial<ResultByUrl>[] = [];
        // const violation: Partial<FullCheckerSingleResult> = {};
        // jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        // jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(
        //     () => new Promise((resolve) => resolve(mockedResults as ResultByUrl[])),
        // );
        // jest.spyOn(mergeResults, 'mergeResults').mockImplementation((result, report) => {
        //     report.violations = [violation as FullCheckerSingleResult];
        // });
        const mockConfig: Partial<Config> = {};
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{ width: 100, height: 200 }];
        mockConfig.json = true;
        mockConfig.threshold = 2;
        mockConfig.login = undefined;
        const helpers = await import('./utils/helper-functions');
        const a11y = await import('./a11y-sitechecker.js');
        return a11y.entry(mockConfig as Config, {}).then((e) => {
            expect(e.length).toBe(1);
            expect(helpers.writeToJsonFile).toBeCalledTimes(1);
        });
    });

    test('throw error in entry', async () => {
        const mockConfig: Partial<Config> = {};
        mockConfig.name = 'Testinger';
        mockConfig.json = true;
        mockConfig.threshold = 2;
        mockConfig.login = undefined;

        const a11y = await import('./a11y-sitechecker.js');
        return a11y
            .entry(mockConfig as Config, {})
            .then((e) => {
                expect(e.length).toBe(10);
            })
            .catch((e) => expect(e.message).toContain('Cannot read properties'));
    });
});
