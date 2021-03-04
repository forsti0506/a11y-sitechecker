import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, saveScreenshot } from './helper-functions';
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
        error(e.message + '. Ignored because normally it means thtat Function already there');
    }
    for (const result of resultByUrl.violations) {
        for (const node of result.nodes) {
            if (!savedScreenshotHtmls.includes(node.html)) {
                debug(config.debugMode, 'Adding border to: ' + JSON.stringify(node.target[0]));
                await page.evaluate(async (elementSelector) => {
                    const dom: Element = document.querySelector(elementSelector);
                    for (let i = 0; i <= 3; i++) {
                        if (dom) {
                            const rect = dom.getBoundingClientRect();
                            const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                            const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                            const elementVisible = !(
                                rect.bottom < 0 ||
                                rect.top - viewHeight >= 0 ||
                                rect.left < 0 ||
                                rect.right > viewWidth
                            );
                            if (elementVisible) {
                                break;
                            }
                            dom.scrollIntoView();
                            await new Promise((resolve) => setTimeout(resolve, i * 2000));
                        }
                    }

                    if (dom.attributes.getNamedItem('style')) {
                        dom.setAttribute(
                            'style',
                            dom.getAttribute('style') + ' outline-style: solid; outline-color: red',
                        );
                    } else {
                        dom.setAttribute('style', 'outline-style: solid; outline-color: red');
                    }
                }, node.target[0]);
                const image = uuidv4() + '.png';
                await saveScreenshot(page, config.imagesPath, image, config.saveImages);
                node.image = image;
                await page.evaluate((element) => {
                    const dom = document.querySelector(element);
                    dom.setAttribute(
                        'style',
                        dom.getAttribute('style').replace('outline-style: solid; outline-color: red', ''),
                    );
                }, node.target[0]);
                savedScreenshotHtmls.push(node.html);
            } else {
                debug(config.debugMode, 'Nothing happend, because already screenshoted: ' + node.html);
            }
        }
    }
}
