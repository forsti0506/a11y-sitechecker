import { Config } from '../models/config';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import { jest } from '@jest/globals';
import { Page } from 'puppeteer';
import FunctionLike = jest.FunctionLike;

jest.unstable_mockModule('./utils/helper-functions', () => ({
    writeToJsonFile: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    waitForHTML: jest.fn(),
}));

describe('accept-consent-screens', () => {
    let config: Config;

    beforeEach(async () => {
        config = await initBeforeTest();
        config.timeout = 15000;
    });
    afterEach(() => {
        return cleanUpAfterTest(config);
    });

    test('no cookie selector provided', async () => {
        expect.assertions(2);
        const stubFrameSpy = jest.spyOn(stubFrame, 'evaluate');

        const cookie = await import('./accept-consent-screens');
        await cookie.acceptCookieConsent(stubPage, config);
        expect(stubFrameSpy).not.toBeCalled();
        const helper = await import('./helper-functions');
        expect(helper.debug).toBeCalledWith(true, 'No cookie element found. Iframe Name or Url: test');
    });

    test('unknown cookie selector provided', async () => {
        expect.assertions(1);
        const helper = await import('./helper-functions');
        Object.defineProperty(global, 'document', {
            writable: true,
            value: mockDocument,
        });

        config.cookieSelector = 'test';
        config.cookieText = 'accept';
        const cookie = await import('./accept-consent-screens');
        await cookie.acceptCookieConsent(stubPage, config);
        expect(helper.debug).toBeCalledWith(true, 'Check frame test for consent button');
    });
});

export const stubPage = {
    evaluate(_test: () => number) {
        return Promise.resolve(10);
    },
    content() {
        return 'html';
    },
    waitForTimeout(_time: number) {
        return Promise.resolve();
    },
    frames() {
        return [stubFrame];
    },
} as unknown as Page;

export const stubFrame = {
    name() {
        return 'test';
    },
    url() {
        return 'test.at';
    },
    evaluate<T extends FunctionLike>(pageFunction: T, ...args: []): Promise<T> {
        if (typeof pageFunction === 'string') {
            return Promise.resolve(pageFunction);
        } else {
            return Promise.resolve(pageFunction(args));
        }
    },
};

export const mockDocument = {
    querySelectorAll(_test: string) {
        return [];
    },
};
