import { Config } from '../models/config';
import { acceptCookieConsent } from './accept-consent-screens';
import { cleanUpAfterTest, initBeforeTest } from './test-helper-functions.spec';
import * as debug from './helper-functions';
import { EvaluateFn, EvaluateFnReturnType, Page, SerializableOrJSHandle, UnwrapPromiseLike } from 'puppeteer/lib/types';

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
        const spyDebug = jest.spyOn(debug, 'debug');
        const stubFrameSpy = jest.spyOn(stubFrame, 'evaluate');

        await acceptCookieConsent(stubPage, config);
        expect(stubFrameSpy).not.toBeCalled();
        expect(spyDebug).toBeCalledWith(true, 'No cookie element found. Iframe Name or Url: test');
    });

    test('unknown cookie selector provided', async () => {
        expect.assertions(1);
        const spyDebug = jest.spyOn(debug, 'debug');
        Object.defineProperty(global, 'document', {
            writable: true,
            value: mockDocument,
        });

        config.cookieSelector = 'test';
        config.cookieText = 'accept';
        await acceptCookieConsent(stubPage, config);
        expect(spyDebug).toBeCalledWith(true, 'Check frame test for consent button');
    });
});

export const stubPage = {
    evaluate(test: () => number) {
        return Promise.resolve(10);
    },
    content() {
        return 'html';
    },
    waitForTimeout(time: number) {
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
    ur() {
        return 'test.at';
    },
    evaluate<T extends EvaluateFn>(
        pageFunction: T,
        ...args: SerializableOrJSHandle[]
    ): Promise<UnwrapPromiseLike<EvaluateFnReturnType<T>>> {
        if (typeof pageFunction === 'string') {
            return Promise.resolve(pageFunction as UnwrapPromiseLike<EvaluateFnReturnType<T>>);
        } else {
            return Promise.resolve(pageFunction(args));
        }
    },
};

export const mockDocument = {
    querySelectorAll(test: string) {
        return [];
    },
};
