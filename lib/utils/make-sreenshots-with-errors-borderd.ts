import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, saveScreenshot } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';
import { exposeDepsJs } from './expose-deep-js';
import { isElementVisible, elementIntersected, highestZIndex } from './is-element-visible';
import { acceptCookieConsent } from './accept-cookies';
import { screenshotSingleDomElement } from './screenshot-single-dom-element';

const uniqueNamePerUrl: Map<string, {id: string, count:number}> = new Map();

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;
        isElementVisible (
            dom: string | null
        ): boolean;
        highestZIndex () : number;
        elementIntersected(elementRect: DOMRect): boolean;
        adjustScrollingBehindFixed: number;
    }
}

export async function makeScreenshotsWithErrorsBorderd(
    resultByUrl: ResultByUrl,
    page: Page,
    config: Config,
    savedScreenshotHtmls: string[],
): Promise<void> {
    if(!uniqueNamePerUrl.get(resultByUrl.url)) {
        uniqueNamePerUrl.set(resultByUrl.url, {id: uuidv4(), count: 0});
    }
    const currentMapObject = uniqueNamePerUrl.get(resultByUrl.url)!;
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
            if (!savedScreenshotHtmls.includes(node.html)) {

                if(config.saveImages && config.imagesPath) {
                    await screenshotSingleDomElement(config.imagesPath + 'test.png' , node.target[0], page, 10);
                    debugger;
                }
                

                const isVisible = await page.evaluate(
                    async (elementSelector, debugMode, currentMapObjectCount) => {
                        const dom: Element = document.querySelector(elementSelector);
                        let elementVisible = false;
                        const errorId = document.querySelectorAll('.errorbordered');
                        if (dom) {
                            if (!dom.id) {
                                dom.setAttribute('id', 'error_id' + errorId.length + 1);
                                dom.classList.add('errorbordered');
                            }
                            let k = 0;
                            while (!elementVisible && k < 10 && dom.getClientRects().length > 0) {
                                if(k === 0) {
                                    dom.scrollIntoView({
                                    behavior: 'auto',
                                    block: 'center',
                                    inline: 'center'
                                    });
                                }
                                if (k > 0) await new Promise((resolve) => setTimeout(resolve, 200));

                                elementVisible = window.isElementVisible(dom.id)
                                if (!elementVisible) {
                                    window.debug(debugMode, 'Element not visible. Try to scroll into view');
                                    dom.scrollIntoView({
                                        behavior: 'auto',
                                        block: 'center',
                                        inline: 'center'
                                    });                              
                                }
                                k++;
                            }
                            if(elementVisible) {
                                const elementRect = dom.getBoundingClientRect();
                                const elementIntersected = window.elementIntersected(elementRect)
                                    

                                console.log('element (' + dom.tagName + ') is intersected by fixed: ' + elementIntersected + ' height: ' + window.adjustScrollingBehindFixed);
                                if(elementIntersected) {
                                    window.scrollBy(0, - window.adjustScrollingBehindFixed);
                                }

                                window.debug(debugMode, '(Count:' + currentMapObjectCount + '). Adding border to: ' + JSON.stringify(elementSelector));

                                if (dom.tagName === 'A') {
                                    dom.setAttribute(
                                        'style',
                                        (dom.getAttribute('style') ? dom.getAttribute('style') : '') +
                                            ' border: 5px dotted violet;',
                                    );
                                } else if (dom.tagName === 'HTML' || dom.tagName === 'VIEWPORT') {
                                    document.body.setAttribute(
                                        'style',
                                        (dom.getAttribute('style') ? dom.getAttribute('style') : '') +
                                            ' outline: 5px dotted violet',
                                    );
                                } else {
                                    dom.setAttribute(
                                        'style',
                                        (dom.getAttribute('style') ? dom.getAttribute('style') : '') +
                                            ' outline: 5px dotted violet',
                                    );
                                }
                            }

                        } else {
                            window.debug(debugMode, 'No element found with selector ' + elementSelector);
                        }
                        return elementVisible;
                    },
                    node.target[0],
                    config.debugMode, currentMapObject.count
                );
                if(isVisible) {
                    const image =  currentMapObject.id + '_' + currentMapObject.count + '.png';
                    await saveScreenshot(page, config.imagesPath, image, config.saveImages);
                    node.image = image;
                    currentMapObject.count++;
                } else {
                    debug(config.debugMode, JSON.stringify(node.target[0]) + ' is not visible anytime');
                    //check if maybe new consent area is here
                    await acceptCookieConsent(page, config);
                }

                await page.evaluate((element) => {
                    const dom = document.querySelector(element);
                    if (dom) {
                        if (dom.tagName === 'A') {
                            dom.setAttribute('style', dom.getAttribute('style')?.replace('border: 5px dotted violet;', ''));
                        } else if (dom.tagName === 'HTML') {
                            const bodyStyle = document.body.getAttribute('style');
                            if (bodyStyle) {
                                document.body.setAttribute(
                                    'style',
                                    bodyStyle.replace('outline: 5px dotted violet', ''),
                                );
                            }
                        } else {
                            dom.setAttribute(
                                'style',
                                dom.getAttribute('style')?.replace('outline: 5px dotted violet', ''),
                            );
                        }
                    }
                }, node.target[0]);
                savedScreenshotHtmls.push(node.html);
            } else {
                debug(config.debugMode, 'Nothing happend, because already screenshoted: ' + node.html);
            }
        }
    }
}
