import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';
import { exposeDepsJs } from './expose-deep-js';
import {
    isElementVisible,
    elementIntersected,
    highestZIndex
} from './is-element-visible';
import { saveScreenshotSingleDomElement } from './helper-saving-screenshots';

const uniqueNamePerUrl: Map<string, { id: string; count: number }> = new Map();

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;
        isElementVisible(dom: string | null): boolean;
        highestZIndex(): number;
        elementIntersected(elementRect: DOMRect): boolean;
        adjustScrollingBehindFixed: number;
    }
}

export async function makeScreenshotsWithErrorsBorderd(
    resultByUrl: ResultByUrl,
    page: Page,
    config: Config,
    savedScreenshotHtmls: string[]
): Promise<void> {
    let currentMapObject = uniqueNamePerUrl.get(resultByUrl.url);
    if (!currentMapObject) {
        uniqueNamePerUrl.set(resultByUrl.url, { id: uuidv4(), count: 0 });
        currentMapObject = uniqueNamePerUrl.get(resultByUrl.url);
    }
    
    debug(config.debugMode, 'make screenshots with border');
    try {
        await page.exposeFunction('debug', debug);
    } catch (e: any) {
        if (config.debugMode) {
            error(
                e.message +
                    '. Ignored because normally it means that function already exposed'
            );
        }
    }

    await page.evaluate(exposeDepsJs({ isElementVisible }));
    await page.evaluate(exposeDepsJs({ highestZIndex }));
    await page.evaluate(exposeDepsJs({ elementIntersected }));

    for (const result of resultByUrl.violations) {
        for (const node of result.nodes) {
            if (!savedScreenshotHtmls.includes(node.html) && currentMapObject) {
                const image = currentMapObject.id + '_' + currentMapObject.count + '.png';
                const screenshotResult = await saveScreenshotSingleDomElement(
                    page,
                    config.imagesPath,
                    image,
                    config.saveImages,
                    node.target[0],
                    10,
                    config.debugMode
                );

                if (typeof screenshotResult === 'boolean' && screenshotResult === true) {
                    node.image = image;
                    currentMapObject.count++;
                } else if (typeof screenshotResult === 'string') {
                    node.image = screenshotResult;
                    currentMapObject.count++;
                }

                savedScreenshotHtmls.push(node.html);
            } else {
                debug(
                    config.debugMode,
                    'Nothing happend, because already screenshoted: ' + node.html
                );
            }
        }
    }
}
