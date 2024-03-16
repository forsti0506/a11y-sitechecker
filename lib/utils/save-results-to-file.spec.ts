import { TestEnvironment } from 'axe-core';
import { jest } from '@jest/globals';
import { A11ySitecheckerResult } from '../models/a11y-sitechecker-result';
import { Config } from '../models/config';
import { SiteResult } from '../models/site-result';
import { PathOrFileDescriptor, readFileSync } from 'fs';

jest.mock('uuid', () => ({
    v4: () => '12345',
}));

const mockResult: Partial<SiteResult> = { analyzedUrls: [] };
jest.unstable_mockModule('./utils/setup-siteresult.js', () => ({
    setupSiteresult: jest.fn().mockImplementation(() => mockResult as SiteResult),
}));

jest.unstable_mockModule('./utils/define-extratags.js', () => ({
    defineExtraTags: jest.fn().mockImplementation(() => void 0),
}));
jest.unstable_mockModule('fs', () => ({
    readFileSync: jest.fn().mockImplementation((file: unknown) => {
        if (file === 'test/results/files.json') return Buffer.from('[{"_id": "12345", "filesByDate": []}]');
        return readFileSync(file as PathOrFileDescriptor);
    }),
    writeFileSync: jest.fn().mockImplementation(() => void 0),
    existsSync: jest.fn().mockImplementation(() => true),
    mkdirSync: jest.fn().mockImplementation(() => void 0),
}));
describe('save-results-to-file', () => {
    test('setup-axe with standard runners and result types', async () => {
        const config: Partial<Config> = {};
        config.resultsPath = 'test/results/';
        config.resultsPathPerUrl = 'test/results/test.at/';
        const sitecheckerResult: Partial<A11ySitecheckerResult> = {};
        sitecheckerResult.testEnvironment = { windowHeight: 100, windowWidth: 100 } as TestEnvironment;
        const save = await import('./save-results-to-file');
        await save.saveResultsToFile(config as Config, sitecheckerResult as A11ySitecheckerResult, 0);
        const fs = await import('fs');
        expect(fs.writeFileSync).toHaveBeenNthCalledWith(1, expect.stringContaining('100_100.json'), expect.anything());
        expect(fs.writeFileSync).toHaveBeenCalledTimes(6);
    });
});
