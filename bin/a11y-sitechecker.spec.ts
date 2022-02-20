import { A11ySitecheckerResult } from './../lib/models/a11y-sitechecker-result';
process.argv = ['--arg', 'hello'];
import 'jest';
import { Config } from '../lib/models/config';
import { cleanUpAfterTest, initBeforeTest } from '../lib/utils/test-helper-functions.spec';
import * as sitechecker from '../lib/a11y-sitechecker';
import { defaultFunction } from './a11y-sitechecker_code';
import { program } from 'commander';
import * as saveResultsToFile from '../lib/utils/save-results-to-file';

describe('a11y-sitechecker-bin', () => {
    let config: Config;
    beforeEach(async () => {
        config = await initBeforeTest();
    });
    afterEach(async () => {
        await cleanUpAfterTest(config);
    });

    test('should exit with error code 0, because empty return', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockReturnValue(Promise.resolve([] as A11ySitecheckerResult[]));
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(0);
    });

    test('should exit with error code 2, because violations return too much', async () => {
        expect.assertions(1);

        const violations = [1, 2, 3];

        jest.spyOn(saveResultsToFile, 'saveResultsToFile').mockImplementation(() => {
            return Promise.resolve();
        });

        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockReturnValue(
            Promise.resolve([{ violations: violations }] as unknown as A11ySitecheckerResult[]),
        );
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(2);
    });

    test('should exit with error code 0, because violations return less than allowed', async () => {
        expect.assertions(1);

        const violations = [1, 2, 3];

        jest.spyOn(saveResultsToFile, 'saveResultsToFile').mockImplementation(() => {
            return Promise.resolve();
        });

        jest.spyOn(program, 'opts').mockImplementation(() => {
            config.threshold = 10;
            return { providedConfig: config, threshold: 10 } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockReturnValue(
            Promise.resolve([{ violations: violations }] as unknown as A11ySitecheckerResult[]),
        );
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(0);
    });

    test('should exit with error code 0, because violations return less than allowed (threshold provided in config)', async () => {
        expect.assertions(1);

        const violations = [1, 2, 3];

        jest.spyOn(saveResultsToFile, 'saveResultsToFile').mockImplementation(() => {
            return Promise.resolve();
        });

        jest.spyOn(program, 'opts').mockImplementation(() => {
            config.threshold = 10;
            return { providedConfig: config } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockReturnValue(
            Promise.resolve([{ violations: violations }] as unknown as A11ySitecheckerResult[]),
        );
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(0);
    });

    test('should exit with error code 1', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockRejectedValue(new Error('Test failed. Any other reason'));
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(1);
    });

    test('should exit with error code 2', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockRejectedValue(new Error('Test failed. Threshold not met'));
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(2);
    });

    test('should exit with error code 3', async () => {
        expect.assertions(1);
        jest.spyOn(program, 'opts').mockImplementation(() => {
            return { providedConfig: config } as any;
        });
        jest.spyOn(sitechecker, 'entry').mockRejectedValue(new Error('Test failed. ERR_NAME_NOT_RESOLVED'));
        const processSpy = jest.spyOn(process, 'exit').mockImplementation((num) => {
            console.log('called with: ' + num);
            return {} as never;
        });

        await defaultFunction();

        expect(processSpy).toHaveBeenCalledWith(3);
    });
});
