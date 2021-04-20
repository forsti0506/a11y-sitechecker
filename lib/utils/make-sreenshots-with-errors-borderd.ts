import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, saveScreenshot } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';

export async function makeScreenshotsWithErrorsBorderd(
    resultByUrl: ResultByUrl,
    page: Page,
    config: Config,
    savedScreenshotHtmls: string[],
): Promise<void> {
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
                '. Ignored because normally it means that Function already there. (Adding debug to winwo in expose object)',
        );
    }
    for (const result of resultByUrl.violations) {
        for (const node of result.nodes) {
            if (!savedScreenshotHtmls.includes(node.html)) {
                debug(config.debugMode, 'Adding border to: ' + JSON.stringify(node.target[0]));
                await page.evaluate(
                    async (elementSelector, debugMode) => {
                        const dom: Element = document.querySelector(elementSelector);
                        if (dom) {
                            let currentDom = dom;
                            let elementVisible = false;
                            let k = 0;
                            const tolerance = 0.01;
                            const percentX = 90;
                            const percentY = 90;

                            while (!elementVisible && k < 10) {
                                if (k > 0) await new Promise((resolve) => setTimeout(resolve, 200));

                                const elementRect = currentDom.getBoundingClientRect();
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
                                    );
                                });

                                if (!elementVisible) dom.scrollIntoView();
                                k++;
                            }
                            if (dom.tagName === 'A') {
                                dom.setAttribute(
                                    'style',
                                    (dom.getAttribute('style') ? dom.getAttribute('style') : '') +
                                        ' border: 1px solid red;',
                                );
                            } else if (dom.tagName === 'HTML' || dom.tagName === 'VIEWPORT') {
                                document.body.setAttribute(
                                    'style',
                                    (dom.getAttribute('style') ? dom.getAttribute('style') : '') +
                                        ' outline-style: solid; outline-color: red',
                                );
                            } else {
                                dom.setAttribute(
                                    'style',
                                    (dom.getAttribute('style') ? dom.getAttribute('style') : '') +
                                        ' outline-style: solid; outline-color: red',
                                );
                            }
                        } else {
                            window.debug(debugMode, 'No element found with selector ' + elementSelector);
                        }
                    },
                    node.target[0],
                    config.debugMode,
                );
                const image = uuidv4() + '.png';
                await saveScreenshot(page, config.imagesPath, image, config.saveImages);
                node.image = image;
                await page.evaluate((element) => {
                    const dom = document.querySelector(element);
                    if (dom) {
                        if (dom.tagName === 'A') {
                            dom.setAttribute('style', dom.getAttribute('style').replace('border: 1px solid red;', ''));
                        } else if (dom.tagName === 'HTML') {
                            const bodyStyle = document.body.getAttribute('style');
                            if (bodyStyle) {
                                document.body.setAttribute(
                                    'style',
                                    bodyStyle.replace('outline-style: solid; outline-color: red', ''),
                                );
                            }
                        } else {
                            dom.setAttribute(
                                'style',
                                dom.getAttribute('style').replace('outline-style: solid; outline-color: red', ''),
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
