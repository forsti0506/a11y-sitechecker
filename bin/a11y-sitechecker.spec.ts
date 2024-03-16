import { A11ySitecheckerResult, FullCheckerSingleResult } from './../lib/models/a11y-sitechecker-result';

process.argv = ['--arg', 'hello'];
import { jest } from '@jest/globals';
import { Config } from '../lib/models/config';
import { cleanUpAfterTest, initBeforeTest } from '../lib/utils/test-helper-functions.spec';
import { Command } from 'commander';

jest.unstable_mockModule('../lib/utils/save-results-to-file', () => ({
    saveResultsToFile: jest.fn().mockImplementation(() => Promise.resolve()),
}));
let violations: A11ySitecheckerResult[] | Error = [] as A11ySitecheckerResult[];
jest.unstable_mockModule('../lib/a11y-sitechecker', () => ({
    entry: jest.fn().mockImplementation(() => {
        if (violations instanceof Error) {
            throw violations;
        }
        return Promise.resolve(violations);
    }),
}));

describe('a11y-sitechecker-bin', () => {
    let config: Config;
    let program: Command;
    beforeEach(async () => {
        config = await initBeforeTest();
        program = new Command();
    });
    afterEach(async () => {
        await cleanUpAfterTest(config);
    });

    test('should exit with error code 0, because empty return', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(0);
    });

    test('should exit with error code 2, because violations return too much', async () => {
        expect.assertions(1);

        violations = [{ violations: [1, 2, 3] as unknown as FullCheckerSingleResult[] }] as A11ySitecheckerResult[];

        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(2);
    });

    test('should exit with error code 0, because violations return less than allowed', async () => {
        expect.assertions(1);

        violations = [1, 2, 3] as unknown as A11ySitecheckerResult[];

        jest.spyOn(program, 'opts').mockImplementation(() => {
            config.threshold = 10;
            return { providedConfig: config, threshold: 10 } as any;
        });
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(0);
    });

    test('should exit with error code 0, because violations return less than allowed (threshold provided in config)', async () => {
        expect.assertions(1);

        violations = [1, 2, 3] as unknown as A11ySitecheckerResult[];

        jest.spyOn(program, 'opts').mockImplementation(() => {
            config.threshold = 10;
            return { providedConfig: config } as any;
        });
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(0);
    });

    test('should exit with error code 1', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        // jest.spyOn(sitechecker, 'entry').mockRejectedValue(new Error('Test failed. Any other reason'));
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(1);
    });

    test('should exit with error code 2', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        violations = new Error('Test failed. Threshold not met');
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(2);
    });

    test('should exit with error code 3', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        violations = new Error('Test failed. ERR_NAME_NOT_RESOLVED');
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        const a11yCode = await import('./a11y-sitechecker_code');
        await a11yCode.defaultFunction(program);

        expect(processSpy).toHaveBeenCalledWith(3);
    });
});
