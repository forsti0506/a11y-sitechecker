import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, saveScreenshot } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';

const uniqueNamePerUrl: Map<string, {id: string, count:number}> = new Map();

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
    page.on('console', (log) => {
        debug(config.debugMode, log.text());
    });
    try {
        await page.exposeFunction('debug', debug);
    } catch (e) {
        debug(
            config.debugMode,
            e.message +
                '. Ignored because normally it means that the function is already exposed. (Adding debug to window in expose object)',
        );
    }
    for (const result of resultByUrl.violations) {
        for (const node of result.nodes) {
            if (!savedScreenshotHtmls.includes(node.html)) {
                const isVisible = await page.evaluate(
                    async (elementSelector, debugMode) => {
                        const dom: Element = document.querySelector(elementSelector);
                        let elementVisible = false;
                        if (dom) {
                            let currentDom = dom;
                            let k = 0;
                            const tolerance = 0.01;
                            const percentX = 90;
                            const percentY = 90;

                            const elementRect = currentDom.getBoundingClientRect();

                            while (!elementVisible && k < 10 && dom.getClientRects().length > 0) {
                                if (k > 0) await new Promise((resolve) => setTimeout(resolve, 200));

                                const parentRects: DOMRect[] = [];
                                while (currentDom.parentElement != null) {
                                    parentRects.push(currentDom.parentElement.getBoundingClientRect());
                                    currentDom = currentDom.parentElement;          
                                }
                                elementVisible = parentRects.every(function (parentRect) {
                                    const visiblePixelX =
                                        Math.min(elementRect.right, parentRect.right) -
                                        Math.max(elementRect.left, parentRect.left);
                                    const visiblePixelY =
                                        Math.min(elementRect.bottom, parentRect.bottom) -
                                        Math.max(elementRect.top, parentRect.top);
                                    const visiblePercentageX = (visiblePixelX / elementRect.width) * 100;
                                    const visiblePercentageY = (visiblePixelY / elementRect.height) * 100;
                                    return (
                                        visiblePercentageX + tolerance > percentX &&
                                        visiblePercentageY + tolerance > percentY
                                    ) && elementRect.top < window.innerHeight && elementRect.bottom >= 0;
                                });
                                if (!elementVisible) {
                                    dom.scrollIntoView();
                                    currentDom = dom;                                
                                }
                                k++;
                            }
                            if(elementVisible) {

                                let adjustScrollingBehindFixed = 0;
                                const elementIntersected = Array.from(document.body.getElementsByTagName("*")).filter(
                                    x => getComputedStyle(x, null).getPropertyValue("position") === "fixed"
                                ).some(fixedElem => {
                                    const fixedElementClientRect = fixedElem.getBoundingClientRect();
                                    const isIntersected = !(
                                        elementRect.top > fixedElementClientRect.bottom ||
                                        elementRect.right < fixedElementClientRect.left ||
                                        elementRect.bottom < fixedElementClientRect.top ||
                                        elementRect.left > fixedElementClientRect.right
                                      );
                                    if ( isIntersected && fixedElementClientRect.height + elementRect.height > adjustScrollingBehindFixed + elementRect.height) {
                                        adjustScrollingBehindFixed = fixedElementClientRect.height + elementRect.height
                                      }
                                      return isIntersected;
                                });

                                console.log('element (' + dom.tagName + ') is intersected by fixed: ' + elementIntersected + ' height: ' + adjustScrollingBehindFixed);
                                if(elementIntersected) {
                                    window.scrollBy(0, -adjustScrollingBehindFixed);
                                }

                                window.debug(config.debugMode, '(Count:' + currentMapObject.count + ')Adding border to: ' + JSON.stringify(node.target[0]));

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
                    config.debugMode,
                );
                if(isVisible) {
                    const image =  currentMapObject.id + '_' + currentMapObject.count + '.png';
                    await saveScreenshot(page, config.imagesPath, image, config.saveImages);
                    node.image = image;
                    currentMapObject.count++;
                } else {
                    debug(config.debugMode, JSON.stringify(node.target[0]) + ' is not visible anytime');
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
