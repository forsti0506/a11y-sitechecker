import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug } from './helper-functions';
import { saveScreenshot } from './helper-saving-screenshots';

let count = 0;

export async function acceptCookieConsent(page: Page, config: Config): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000)); //wait for frames to be loaded; ToDo: consider alternatives
    const frames = page.frames();
    let cookieId;
    for (const frame of frames) {
        debug(
            config.debugMode,
            'Check frame ' + (frame.name() || frame.url()) + ' for consent button'
        );
        if (config.cookieSelector && config.cookieText) {
            cookieId = await frame.evaluate(
                (cookieSelector, cookieText, count) => {
                    const elements = document.querySelectorAll(cookieSelector);
                    const cookieElements = Array.from(elements).filter((d) =>
                        RegExp(cookieText, 'i').test(d.textContent.trim())
                    );
                    console.log(JSON.stringify(cookieElements.length));
                    if (cookieElements && cookieElements.length > 0) {
                        const element: HTMLElement = cookieElements[0];
                        if (!element.id) {
                            element.setAttribute('id', 'consent_screen_' + count);
                        }
                        return cookieElements[0].id;
                    } else {
                        return undefined;
                    }
                },
                config.cookieSelector,
                config.cookieText,
                count
            );
        }

        if (cookieId) {
            await saveScreenshot(
                page,
                config.imagesPath,
                'consent_screen_' + count + '.png',
                config.saveImages,
                config.debugMode
            );
            await frame.evaluate((cookieId) => {
                const element = document.getElementById(cookieId);
                element?.click();
            }, cookieId);
            count++;
            break;
        } else {
            debug(
                config.debugMode,
                'No cookie element found. Iframe Name or Url: ' +
                    (frame.name() || frame.url())
            );
        }
    }
}
