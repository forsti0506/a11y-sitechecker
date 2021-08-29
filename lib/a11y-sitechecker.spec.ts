import { mock, mockDeep } from 'jest-mock-extended';
import { entry } from './a11y-sitechecker';
import { FullCheckerSingleResult, ResultByUrl } from './models/a11y-sitechecker-result';
import { Config } from './models/config';
import * as analyzeSite from './utils/analyze-site';
import * as helpers from './utils/helper-functions';
import * as mergeResults from './utils/result-functions';
import * as setupConfigMock from './utils/setup-config';
import { setupAxeConfig, setupConfig } from './utils/setup-config';

describe('a11y-sitechecker', () => {
    test('Error on empty config', async () => {
        const mockConfig = mock<Config>();
        expect(async () => await entry(mockConfig, {})).toThrowError;
    });
    
    test('1 result with name set', async () => {
        jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(() => new Promise((resolve) => resolve([])));
        jest.spyOn(mergeResults, 'mergeResults').mockImplementation(() => void 0)
        const mockConfig = mock<Config>();
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{width: 100, height: 200}];
        mockConfig.json = false;
        const results = await entry(mockConfig, {});
        expect(results[0].name).toBe('Testinger');
        expect(results.length).toBe(1);
    }); 

    test('Threshold not met', () => {
        const mockedResults: Partial<ResultByUrl>[] = [];
        const violation = mockDeep<FullCheckerSingleResult>();
        jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(() => new Promise((resolve) => resolve(mockedResults as ResultByUrl[])));
        jest.spyOn(mergeResults, 'mergeResults').mockImplementation((result, report) => { // @ts-ignore
            report.violations = [violation]});
        const mockConfig = mock<Config>();
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{width: 100, height: 200}];
        mockConfig.json = false;
        mockConfig.threshold = 0;
        mockConfig.login = undefined;
    
        return entry(mockConfig, {}).then(e => expect(e.length).toBe(10)).catch(e => expect(e.message).toContain('Threshold not met'));
    }); 
    test('Threshold met', () => {
        const mockedResults: Partial<ResultByUrl>[] = [];
        const violation = mockDeep<FullCheckerSingleResult>();
        jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(() => new Promise((resolve) => resolve(mockedResults as ResultByUrl[])));
        jest.spyOn(mergeResults, 'mergeResults').mockImplementation((result, report) => {report.violations = [violation]});
        const mockConfig = mock<Config>();
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{width: 100, height: 200}];
        mockConfig.json = false;
        mockConfig.threshold = 2;
        mockConfig.login = undefined;
    
        return entry(mockConfig, {}).then(e => expect(e.length).toBe(1));
    }); 

    test('Write to JSON File', () => {
        const mockedResults: Partial<ResultByUrl>[] = [];
        const violation = mockDeep<FullCheckerSingleResult>();
        jest.spyOn(setupConfigMock, 'prepareWorkspace').mockImplementation(() => void 0);
        jest.spyOn(analyzeSite, 'analyzeSite').mockImplementation(() => new Promise((resolve) => resolve(mockedResults as ResultByUrl[])));
        jest.spyOn(mergeResults, 'mergeResults').mockImplementation((result, report) => {report.violations = [violation]});
        const writeToJson = jest.spyOn(helpers, 'writeToJsonFile').mockImplementation();
        const mockConfig = mock<Config>();
        mockConfig.name = 'Testinger';
        mockConfig.viewports = [{width: 100, height: 200}];
        mockConfig.json = true;
        mockConfig.threshold = 2;
        mockConfig.login = undefined;
    
        return entry(mockConfig, {}).then(e => {
            expect(e.length).toBe(1);
            expect(writeToJson).toBeCalledTimes(1);
        });
    }); 

    test('throw error in entry', () => {
        const mockConfig = mock<Config>();
        mockConfig.name = 'Testinger';
        mockConfig.json = true;
        mockConfig.threshold = 2;
        mockConfig.login = undefined;
    
        return entry(mockConfig, {}).then(e => {
            expect(e.length).toBe(10);
        }).catch(e => expect(e.message).toContain('config.viewports.forEach is not'));
    }); 

    test('Error on empty config testinger', () => {
        const mockConfig = setupConfig({providedConfig: JSON.parse(`
            
            {
                "name": "Test",
                "urlsToAnalyze": [
                    "https://www.kurier.at"
                ],
                "saveImages": true,
                "cookieSelector":"button",
                "cookieText":"^(Alle akzeptieren|Akzeptieren|Verstanden|Zustimmen|Okay|OK|Alle Cookies akzeptieren|Einverstanden)$",
                "debugMode": true
            }
    `
        )});
        return entry(mockConfig, setupAxeConfig(mockConfig));
    });
    
});
