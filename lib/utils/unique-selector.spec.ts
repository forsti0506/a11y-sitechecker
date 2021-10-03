import { Config } from '../models/config';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';

import JSDOM from 'jsdom';
import { getUniqueSelector } from './unique-selector';

describe('unique-selector', () => {
    let config: Config;
    let jsdom: any;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
        jsdom = new JSDOM.JSDOM(`
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

    test('node not there', async () => {
        const node = jsdom.window.document.createElement('p');
        expect(getUniqueSelector(node, jsdom)).toBe('');
    });

    test('find first p node', async () => {
        const node = jsdom.window.document.createElement('p');
        jsdom.window.document.body.appendChild(node);
        expect(getUniqueSelector(node, jsdom)).toBe('p:nth-of-type(1)');
    });

    test('find first span node', async () => {
        const node = jsdom.window.document.createElement('p');
        const span = node.appendChild(jsdom.window.document.createElement('span'));
        jsdom.window.document.body.appendChild(node);
        expect(getUniqueSelector(span, jsdom)).toBe('span:nth-of-type(1)');
    });

    test('find node by id', async () => {
        const node = jsdom.window.document.createElement('p');
        const span = node.appendChild(jsdom.window.document.createElement('span'));
        span.setAttribute('id', 'testid');
        jsdom.window.document.body.appendChild(node);
        expect(getUniqueSelector(span, jsdom)).toBe('#testid');
    });

    test('find node by classes', async () => {
        const node = jsdom.window.document.createElement('p');
        const span = node.appendChild(jsdom.window.document.createElement('span'));
        span.setAttribute('class', 'testclass testclass2');
        jsdom.window.document.body.appendChild(node);
        expect(getUniqueSelector(span, jsdom)).toBe('span.testclass.testclass2');
    });
});
