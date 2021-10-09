import { A11ySitecheckerResult } from './../../lib/models/a11y-sitechecker-result';
import { Config } from '../models/config';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import { defineExtraTags } from './define-extratags';

describe('get-links', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('no extra tags provided', async () => {
        defineExtraTags({} as A11ySitecheckerResult, config);
        expect(true).toBeTruthy();
    });

    test('extra tags provided', async () => {
        config.idTags = {
            'aria-required-attr': ['XYZ'],
            'meta-viewport': ['Z'],
        };

        const result = {
            toolOptions: 'test',
            violations: [{ id: 'aria-required-attr' }, { id: 'meta-viewport' }],
            incomplete: [{ id: 'meta-viewport' }, { id: 'aria-required-attr' }],
            inapplicable: [{ id: 'aria-required-attr' }],
            passes: [{ id: 'aria-required-attr' }],
        };

        defineExtraTags(result as unknown as A11ySitecheckerResult, config);
        expect(result.violations[0]).toEqual({ customTags: ['XYZ'], id: 'aria-required-attr' });
        expect(result.violations[1]).toEqual({ customTags: ['Z'], id: 'meta-viewport' });
        expect(result.incomplete[0]).toEqual({ customTags: ['Z'], id: 'meta-viewport' });
        expect(result.incomplete[1]).toEqual({ customTags: ['XYZ'], id: 'aria-required-attr' });
        expect(result.inapplicable[0]).toEqual({ customTags: ['XYZ'], id: 'aria-required-attr' });
        expect(result.passes[0]).toEqual({ customTags: ['XYZ'], id: 'aria-required-attr' });
    });
});
