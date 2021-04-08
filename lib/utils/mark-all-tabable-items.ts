import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, saveScreenshot } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';
import { ElementsFromEvaluation, ElementVisibility } from '../models/small-ones';
import { ResultByUrl } from '../models/a11y-sitechecker-result';

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;
    }
}

export async function markAllTabableItems(
    page: Page,
    url: string,
    config: Config,
    urlResult: ResultByUrl,
): Promise<void> {
    debug(config.debugMode, 'make screens for tabable items');
    try {
        await page.exposeFunction('debug', debug);
    } catch (e) {
        error(e.message + '. Ignored because normally it means thtat Function already there');
    }

    const elementsFromEvaluation: ElementsFromEvaluation = JSON.parse(
        await page.evaluate(async (debugMode) => {
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
            const elmtsFromEval: ElementsFromEvaluation = {
                focusableNonStandardElements: [],
                elementsByVisibility: [],
            };
            const alreadyMarkeds: { top: number; right: number }[] = [];
            for (const element of focusableElements) {
                if (element.getAttribute('style')) {
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
                let elementExtraAdjusting = 0;
                for (const alreadyMarked of alreadyMarkeds) {
                    if (
                        Math.abs(alreadyMarked.right - rect.right) < 20 &&
                        Math.abs(alreadyMarked.top - rect.top) < 20
                    ) {
                        elementExtraAdjusting = 20;
                    }
                }
                await window.debug(debugMode, elementExtraAdjusting + ' px are extra adjustet');

                tabNumberSpan.setAttribute(
                    'style',
                    'position: absolute; font-size:16px; font-weight: bold; background-color:red; width:30px; line-height: 18px; text-align: center; color:#fff; z-index: 1000; border-radius: 3px; left: ' +
                        rect.right +
                        'px; top: ' +
                        (rect.top + elementExtraAdjusting) +
                        'px',
                );
                alreadyMarkeds.push({ right: rect.right, top: rect.top });

                tabNumberSpan.setAttribute('id', 'span_id' + i);

                elmtsFromEval.elementsByVisibility.push({ element: element.id, visible: elementVisible });
                await window.debug(debugMode, element.tagName + ' is visible: ' + elementVisible);

                document.body.appendChild(tabNumberSpan);
                await window.debug(debugMode, element.tagName + ' got number: ' + i);

                const standardTags = ['A', 'AREA', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'DETAILS', 'IFRAME'];
                if (!standardTags.includes(element.tagName.toUpperCase())) {
                    elmtsFromEval.focusableNonStandardElements.push(element.id);
                }
                i++;
            }
            return JSON.stringify(elmtsFromEval);
        }, config.debugMode),
    );

    const client = await page.target().createCDPSession();
    const elementsWithOutKeypress: string[] = [];
    for (const felement of elementsFromEvaluation.focusableNonStandardElements) {
        let nodeObject = ((await client.send('Runtime.evaluate', {
            expression: felement,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any).result;
        let listenerObject = await client.send('DOMDebugger.getEventListeners', {
            objectId: nodeObject.objectId,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (
            (listenerObject as unknown).listeners.filter((f) => f.type === 'keypress').length <= 0 &&
            (listenerObject as unknown).listeners.filter((f) => f.type === 'keydown').length <= 0
        ) {
            await page.evaluate((felement) => {
                document.getElementById(felement)?.parentElement?.setAttribute('id', 'testinger');
            }, felement);
            elementsWithOutKeypress.push(felement);
            nodeObject = ((await client.send('Runtime.evaluate', {
                expression: 'testinger',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any).result;
            listenerObject = await client.send('DOMDebugger.getEventListeners', {
                objectId: nodeObject.objectId,
            });
        }
    }

    await page.evaluate(
        async (elementsWithoutKeypress, debugMode) => {
            for (const element of elementsWithoutKeypress) {
                window.debug(debugMode, 'Element without keypress: ' + element);
                const spanElement = document.getElementById('span_' + element);
                if (spanElement) spanElement.innerHTML += 'E';
            }
        },
        elementsWithOutKeypress,
        config.debugMode,
    );

    const imageId = uuidv4();
    let i = 0;
    while (i === 0 || elementsFromEvaluation.elementsByVisibility.filter((e) => !e.visible).length > 0) {
        elementsFromEvaluation.elementsByVisibility = JSON.parse(
            await page.evaluate(
                async (elementsByVisibility, debugMode) => {
                    const elmtsByVisibility: ElementVisibility[] = JSON.parse(elementsByVisibility);
                    const elementsToSplice: number[] = [];
                    let firstVisibleElement = false;
                    for (let j = 0; j < elmtsByVisibility.length; j++) {
                        const elementById = document.getElementById(elmtsByVisibility[j].element);
                        if (elementById) {
                            let rect = elementById.getBoundingClientRect();
                            let viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                            let viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                            let elementVisible = !(
                                rect.bottom < 0 ||
                                rect.top - viewHeight >= 0 ||
                                rect.left < 0 ||
                                rect.right > viewWidth
                            );
                            if (!elementVisible && !firstVisibleElement) {
                                elementById.scrollIntoView();
                                let k = 0;
                                while (!elementVisible && k < 10) {
                                    rect = elementById.getBoundingClientRect();
                                    viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                                    viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                                    await new Promise((resolve) => setTimeout(resolve, 200));
                                    elementVisible = !(
                                        rect.bottom < 0 ||
                                        rect.top - viewHeight >= 0 ||
                                        rect.left < 0 ||
                                        rect.right > viewWidth
                                    );
                                    k++;
                                }
                                if (k >= 10) {
                                    elementsToSplice.push(j);
                                } else {
                                    firstVisibleElement = true;
                                    elmtsByVisibility[j].visible = true;
                                }
                            } else if (elementVisible && !firstVisibleElement) {
                                elmtsByVisibility[j].visible = true;
                                firstVisibleElement = true;
                                window.debug(debugMode, 'Element visible after first visble element');
                            } else if (firstVisibleElement && !elementVisible) {
                                window.debug(
                                    debugMode,
                                    'Breaked because after first visble Element another was not visible',
                                );
                                break;
                            } else {
                                elmtsByVisibility[j].visible = elementVisible;
                            }

                            await window.debug(
                                debugMode,
                                elementById +
                                    ' is visible: ' +
                                    elementVisible +
                                    ' number ' +
                                    j +
                                    ' of ' +
                                    elmtsByVisibility.length,
                            );
                        }
                    }
                    for (const elmToSPlice of elementsToSplice) {
                        elmtsByVisibility.splice(elmToSPlice, 1);
                    }

                    return JSON.stringify(elmtsByVisibility);
                },
                JSON.stringify(elementsFromEvaluation.elementsByVisibility),
                config.debugMode,
            ),
        );
        const imageName = imageId + '_' + i + '.png';
        await saveScreenshot(page, config.imagesPath, imageName, true, config.debugMode);
        elementsFromEvaluation.elementsByVisibility = elementsFromEvaluation.elementsByVisibility.filter(
            (v) => !v.visible,
        );
        urlResult.tabableImages.push(imageName);
        i++;
    }
}
