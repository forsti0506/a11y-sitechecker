import { FullCheckerSingleResult } from '../models/a11y-sitechecker-result';
import { setupSiteresult } from './setup-siteresult';

describe('setup-siteresult', () => {
    test('Dummy test', () => {
        const result = setupSiteresult('test', {
            analyzedUrls: [],
            inapplicable: [testViolation, testViolation],
            incomplete: [testViolation],
            passes: [testViolation],
            tabableImages: [],
            testEngine: { name: 'test', version: '1.0' },
            testEnvironment: { userAgent: 'Hello', windowHeight: 100, windowWidth: 100 },
            testRunner: { name: 'axe' },
            toolOptions: {},
            timestamp: '',
            usedLocale: 'de',
            violations: [testViolation],
            name: 'url',
        });
        expect(result).toStrictEqual({
            analyzedUrls: [],
            countInapplicable: 2,
            countIncomplete: 1,
            countPasses: 1,
            countViolations: 1,
            id: 'test',
            tabableImages: [],
            testEngine: {
                name: 'test',
                version: '1.0',
            },
            testEnvironment: {
                userAgent: 'Hello',
                windowHeight: 100,
                windowWidth: 100,
            },
            testRunner: {
                name: 'axe',
            },
            timestamp: '',
            toolOptions: {},
            name: 'url',
        });
    });
});

const testViolation: FullCheckerSingleResult = {
    id: 'test',
    description: 'helloo',
    help: 'Ist so',
    nodes: [{ targetResult: { target: ['yes'], urls: [] }, all: [], any: [], html: '', image: '', none: [] }],
    helpUrl: 'www.test.at',
    tags: [],
};
