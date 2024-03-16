/**
 * @jest-environment jsdom
 */
import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';
import { Config } from '../models/config';
import { isElementVisible } from './is-element-visible';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

describe('is-element-visible', () => {
    let config: Config;
    let jsdom: JSDOM;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;

        jsdom = new JSDOM(`
        <!DOCTYPE html>
        <html lang="en">
        <head><title>TypeScript Dom Manipulation</title></head>
        <body>
            <div id="app"></div>
            <!-- Assume index.js is the compiled output of index.ts -->
            <script src="index.js"></script>
        </body>
        </html>
    `);
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('no element provided', async () => {
        expect(isElementVisible('')).toBe(false);
    });

    test('no element provided with null', async () => {
        expect(isElementVisible(null)).toBe(false);
    });

    test('element provided', async () => {
        const retValue = jsdom.window.document.getElementById('app') as HTMLElement;
        jest.spyOn(retValue, 'getBoundingClientRect').mockReturnValue({
            x: 100,
            y: 100,
            height: 100,
            width: 100,
        } as DOMRect);

        document.elementFromPoint = () => {
            return {} as HTMLElement;
        };

        jest.spyOn(document, 'querySelector').mockReturnValue(retValue);
        jest.spyOn(global, 'getComputedStyle').mockReturnValue({ visibility: 'visible' } as CSSStyleDeclaration);

        expect(isElementVisible('app')).toBe(false);
    });
});
