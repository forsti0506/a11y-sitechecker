import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, saveScreenshot } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';
import { ElementsFromEvaluation, VisibleElement } from '../models/small-ones';
import { ResultByUrl } from '../models/a11y-sitechecker-result';

export async function markAllTabableItems(
    page: Page,
    url: string,
    config: Config,
    resultsByUrl: ResultByUrl[],
): Promise<void> {
    debug(config.debugMode, 'make screens for tabable items');
    try {
        await page.exposeFunction('debug', debug);
    } catch (e) {
        error(e.message + '. Ignored because normally it means thtat Function already there');
    }

    const elementsFromEvaluation: ElementsFromEvaluation = JSON.parse(
        await page.evaluate(async () => {
            const focusableElements = Array.from(
                document.querySelectorAll(
                    'a[href], area[href], button, input, textarea, select, details, iframe, [tabindex]:not([tabindex^="-"])',
                ),
            ).filter(
                (el) =>
                    !(el as HTMLElement).hasAttribute('disabled') &&
                    (el as HTMLElement).offsetWidth > 0 &&
                    (el as HTMLElement).offsetHeight > 0 &&
                    window.getComputedStyle(el).visibility !== 'hidden',
            );
            let i = 1;
            const elmtsFromEval: ElementsFromEvaluation = { focusableNonStandardElements: [], visibleElements: [] };
            for (const element of focusableElements) {
                if (element.attributes['style']) {
                    element.setAttribute(
                        'style',
                        element.getAttribute('style') + '; outline-style: solid; outline-color: red',
                    );
                } else {
                    element.setAttribute('style', 'outline-style: solid; outline-color: red');
                }
                if (!element.id) {
                    element.setAttribute('id', 'id' + i);
                }

                const rect = element.getBoundingClientRect();
                const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                const elementVisible = !(
                    rect.bottom < 0 ||
                    rect.top - viewHeight >= 0 ||
                    rect.left < 0 ||
                    rect.right > viewWidth
                );

                const tabNumberSpan = document.createElement('SPAN');
                const tabNumberText = document.createTextNode(i.toString());
                tabNumberSpan.appendChild(tabNumberText);
                if (element.tagName === 'A') {
                    tabNumberSpan.setAttribute(
                        'style',
                        'font-size:16px; font-weight: bold; background-color:red; width:30px; line-height: 18px; text-align: center; color:#fff; z-index: 1000; border-radius: 3px; left: 2px;',
                    );
                } else {
                    tabNumberSpan.setAttribute(
                        'style',
                        'font-size:16px; font-weight: bold; background-color:red; width:30px; line-height: 18px; text-align: center; color:#fff; z-index: 1000; border-radius: 3px; left: 2px; float:right;',
                    );
                }

                tabNumberSpan.setAttribute('id', 'span_id' + i);

                elmtsFromEval.visibleElements.push({ element: element.id, visible: elementVisible });
                await window.debug(true, element.tagName + ' is visible: ' + elementVisible);

                if (element.tagName === 'IFRAME') {
                    element.before(tabNumberSpan);
                    await window.debug(true, element.tagName + ' got number: ' + i);
                } else {
                    element.appendChild(tabNumberSpan);
                    await window.debug(true, element.tagName + ' got number: ' + i);
                }
                const standardTags = ['A', 'AREA', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'DETAILS', 'IFRAME'];
                if (!standardTags.includes(element.tagName.toUpperCase())) {
                    elmtsFromEval.focusableNonStandardElements.push(element.id);
                }
                i++;
            }
            return JSON.stringify(elmtsFromEval);
        }),
    );

    const client = await page.target().createCDPSession();
    const elementsWithOutKeypress: string[] = [];
    for (const felement of elementsFromEvaluation.focusableNonStandardElements) {
        const nodeObject = ((await client.send('Runtime.evaluate', {
            expression: felement,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any).result;
        const listenerObject = await client.send('DOMDebugger.getEventListeners', {
            objectId: nodeObject.objectId,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((listenerObject as any).listeners.filter((f) => f.type === 'keypress').length <= 0) {
            elementsWithOutKeypress.push(felement);
        }
    }

    await page.evaluate(async (elementsWithoutKeypress) => {
        for (const element of elementsWithoutKeypress) {
            window.debug(true, 'Element without keypress: ' + element);
            const spanElement = document.getElementById('span_' + element);
            if (spanElement) spanElement.innerHTML += 'E';
        }
    }, elementsWithOutKeypress);

    const imageId = uuidv4();
    let i = 0;
    while (elementsFromEvaluation.visibleElements.filter((e) => !e.visible).length > 0) {
        elementsFromEvaluation.visibleElements = JSON.parse(
            await page.evaluate(async (notVisibleElements) => {
                const notVisibleElmts: VisibleElement[] = JSON.parse(notVisibleElements);
                const elementsToSplice: number[] = [];
                for (let j = 0; j < notVisibleElmts.length; j++) {
                    const elementById = document.getElementById(notVisibleElmts[j].element);
                    if (elementById) {
                        for (let i = 0; i <= 3; i++) {
                            const rect = elementById.getBoundingClientRect();
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
                            elementById.scrollIntoView();
                            //needed to ensure it scrolled down
                            await new Promise((resolve) => setTimeout(resolve, i * 2000));
                        }

                        const rect = elementById.getBoundingClientRect();
                        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                        const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                        const currentElementVisible = !(
                            rect.bottom < 0 ||
                            rect.top - viewHeight >= 0 ||
                            rect.left < 0 ||
                            rect.right > viewWidth
                        );
                        await window.debug(
                            true,
                            elementById +
                                ' is visible: ' +
                                currentElementVisible +
                                ' number ' +
                                j +
                                ' of ' +
                                notVisibleElmts.length,
                        );
                        if (currentElementVisible) {
                            break;
                        } else {
                            elementsToSplice.push(j);
                        }
                    }
                }
                for (const elmToSPlice of elementsToSplice) {
                    notVisibleElmts.splice(elmToSPlice, 1);
                }
                for (let j = 0; j < notVisibleElmts.length; j++) {
                    const elementById = document.getElementById(notVisibleElmts[j].element);
                    if (elementById) {
                        const rect = elementById.getBoundingClientRect();
                        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                        const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                        const currentElementVisible = !(
                            rect.bottom < 0 ||
                            rect.top - viewHeight >= 0 ||
                            rect.left < 0 ||
                            rect.right > viewWidth
                        );
                        if (currentElementVisible) {
                            notVisibleElmts.filter(
                                (e) => e.element === notVisibleElmts[j].element,
                            )[0].visible = currentElementVisible;
                        }
                    }
                }
                return JSON.stringify(notVisibleElmts);
            }, JSON.stringify(elementsFromEvaluation.visibleElements)),
        );
        const imageName = imageId + '_' + i + '.png';
        await saveScreenshot(page, config.imagesPath, imageName, true, config.debugMode);
        elementsFromEvaluation.visibleElements = elementsFromEvaluation.visibleElements.filter((v) => !v.visible);
        resultsByUrl.filter((u) => u.url === url)[0].tabableImages.push(imageName);
        i++;
    }
}
