import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, saveScreenshot } from './helper-functions';

let count = 0;


export async function acceptCookieConsent(page: Page, config: Config): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 2000)); //wait for frames to be loaded; ToDo: consider alternatives
    const frames = page.frames();
    let cookieId;
    for(const frame of frames) {
        cookieId = await frame.evaluate((cookieSelector, cookieText, count) => {
            console.log(JSON.stringify(document.body.classList))
                const elements = document.querySelectorAll(cookieSelector);
                console.log('lengthinger' + elements.length)
                const cookieElements = Array.from(elements).filter(d => RegExp(cookieText, 'i').test(d.textContent.trim()))
                console.log(JSON.stringify(cookieElements.length))
                if (cookieElements && cookieElements.length > 0) {
                    console.log('okaaay')
                    const element: HTMLElement = cookieElements[0];
                    if (!element.id) {
                        element.setAttribute('id', 'consent_screen_' + count);
                    }
                    return cookieElements[0].id;
                } else {
                    return undefined;
                }
        }, config.cookieSelector!, config.cookieText!, count);
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
            debug(config.debugMode, 'Nothing found');
        }
    }
    
}
