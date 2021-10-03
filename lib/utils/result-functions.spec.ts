import { A11ySitecheckerResult, ResultByUrl } from '../models/a11y-sitechecker-result';
import { Config } from '../models/config';
import { mergeResults } from './result-functions';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

describe('result-functions', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('no results if no results provided', async () => {
        const resultByUrl1 = {
            toolOptions: 'test',
            violations: [],
            incomplete: [],
            inapplicable: [],
            passes: [],
        };

        const resultsByUrls: ResultByUrl[] = [];
        resultsByUrls.push(resultByUrl1 as unknown as ResultByUrl);
        const result: A11ySitecheckerResult = {
            analyzedUrls: [],
            tabableImages: [],
        } as unknown as A11ySitecheckerResult;
        mergeResults(resultsByUrls, result);
        expect(result.toolOptions).toBe('test');
        expect(result.violations).toBe(undefined);
    });

    test('merge violations', async () => {
        const resultByUrl1 = {
            toolOptions: 'test',
            violations: [
                { id: 'test1', nodes: [{ html: '<span>test</span>', target: 'testtarget' }] },
                {
                    id: 'test2',
                    nodes: [
                        { html: '<span>test</span>', target: 'testtarget1' },
                        { html: '<span>test1</span>', target: 'testtarget1' },
                    ],
                },
            ],
            incomplete: [],
            inapplicable: [],
            passes: [],
        };

        const resultByUrl2 = {
            toolOptions: 'test',
            violations: [
                {
                    id: 'test1',
                    nodes: [
                        { html: '<span>test</span>', target: 'testtarget' },
                        { html: '<span>test1</span>', target: 'testtarget1' },
                    ],
                },
                { id: 'test2', nodes: [{ html: '<span>test1</span>', target: 'testtarget1' }] },
                { id: 'test3', nodes: [{ html: '<span>test3</span>', target: 'testtarget3' }] },
            ],
            incomplete: [],
            inapplicable: [],
            passes: [],
        };

        const resultsByUrls: ResultByUrl[] = [];
        resultsByUrls.push(resultByUrl1 as unknown as ResultByUrl);
        resultsByUrls.push(resultByUrl2 as unknown as ResultByUrl);
        const result: A11ySitecheckerResult = {
            analyzedUrls: [],
            tabableImages: [],
            violations: [],
        } as unknown as A11ySitecheckerResult;
        mergeResults(resultsByUrls, result);
        expect(result.toolOptions).toBe('test');
        expect(result.violations.filter((r) => r.id === 'test1').length).toBe(1);
        expect(result.violations.filter((r) => r.id === 'test1')[0].nodes.length).toBe(2);
        expect(result.violations.filter((r) => r.id === 'test2').length).toBe(1);
        expect(result.violations.filter((r) => r.id === 'test2')[0].nodes.length).toBe(2);
        expect(result.violations.filter((r) => r.id === 'test3').length).toBe(1);
        expect(result.violations.filter((r) => r.id === 'test3')[0].nodes.length).toBe(1);
    });
});
