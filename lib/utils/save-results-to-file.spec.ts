import { TestEnvironment } from 'axe-core';
import fs from 'fs';
import 'jest';
// users.test.js
import { A11ySitecheckerResult } from '../models/a11y-sitechecker-result';
import { Config } from '../models/config';
import { SiteResult } from '../models/site-result';
import * as defineExtraTags from '../utils/define-extratags';
import * as setupSiteresult from '../utils/setup-siteresult';
import { saveResultsToFile } from './save-results-to-file';
jest.mock('uuid', () => ({
    v4: () => '12345',
}));

describe('save-results-to-file', () => {
    test('setup-axe with standard runners and result types', async () => {
        // expect.assertions(1);
        const mockResult: Partial<SiteResult> = { analyzedUrls: [] };
        jest.spyOn(setupSiteresult, 'setupSiteresult').mockImplementation(() => mockResult as SiteResult);
        jest.spyOn(defineExtraTags, 'defineExtraTags').mockImplementation(() => void 0);
        // uuid.mockResolvedValue("12345");
        const writeFileMock = jest.spyOn(fs, 'writeFileSync').mockImplementation(() => void 0);
        jest.spyOn(fs, 'readFileSync').mockImplementation((file) => {
            if (file === 'test/results/files.json') return Buffer.from('[{"_id": "12345", "filesByDate": []}]');
            return fs.readFileSync(file);
        });
        const config: Partial<Config> = {};
        config.resultsPath = 'test/results/';
        config.resultsPathPerUrl = 'test/results/test.at/';
        const sitecheckerResult: Partial<A11ySitecheckerResult> = {};
        sitecheckerResult.testEnvironment = { windowHeight: 100, windowWidth: 100 } as TestEnvironment;

        await saveResultsToFile(config as Config, sitecheckerResult as A11ySitecheckerResult, 0);
        expect(writeFileMock).toHaveBeenNthCalledWith(1, expect.stringContaining('100_100.json'), expect.anything());
        expect(writeFileMock).toHaveBeenCalledTimes(6);
    });
});
