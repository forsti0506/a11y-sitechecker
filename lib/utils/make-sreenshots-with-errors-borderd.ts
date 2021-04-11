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
                            let elementVisible = false;
                            let k = 0;

                            while (!elementVisible && k < 10) {
                                if (k > 0) await new Promise((resolve) => setTimeout(resolve, 200));
                                const rect = dom.getBoundingClientRect();
                                const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                                const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                                elementVisible = !(
                                    rect.bottom < 0 ||
                                    rect.top - viewHeight >= 0 ||
                                    rect.left < 0 ||
                                    rect.right > viewWidth
                                );
                                if (!elementVisible) dom.scrollIntoView();
                                k++;
                            }
                            if (dom.attributes.getNamedItem('style')) {
                                dom.setAttribute(
                                    'style',
                                    dom.getAttribute('style') + ' outline-style: solid; outline-color: red',
                                );
                            } else {
                                dom.setAttribute('style', 'outline-style: solid; outline-color: red');
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
                        dom.setAttribute(
                            'style',
                            dom.getAttribute('style').replace('outline-style: solid; outline-color: red', ''),
                        );
                    }
                }, node.target[0]);
                savedScreenshotHtmls.push(node.html);
            } else {
                debug(config.debugMode, 'Nothing happend, because already screenshoted: ' + node.html);
            }
        }
    }
}
