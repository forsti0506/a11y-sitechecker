import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, saveScreenshot } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';
import { ElementsFromEvaluation } from '../models/small-ones';
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
    let runs = 0;
    let elementsFromEvaluation: ElementsFromEvaluation = {
        focusableNonStandardElements: [],
        elementsByVisibility: [],
        currentIndex: 0,
    };
    const imageId = uuidv4();
    while (runs === 0 || elementsFromEvaluation.elementsByVisibility.length > 0) {
        elementsFromEvaluation = JSON.parse(
            await page.evaluate(
                async (debugMode, elementsFromEvaluationInput) => {
                    const alreadyMarkeds: { top: number; right: number }[] = [];
                    const doIt = async (elementRect: DOMRect, i: number): Promise<void> => {
                        const tabNumberSpan = document.createElement('SPAN');
                        const tabNumberText = document.createTextNode(i.toString());
                        tabNumberSpan.appendChild(tabNumberText);
                        let elementExtraAdjusting = 0;
                        for (const alreadyMarked of alreadyMarkeds) {
                            if (
                                Math.abs(alreadyMarked.right - elementRect.right) < 20 &&
                                Math.abs(alreadyMarked.top - elementRect.top) < 20
                            ) {
                                elementExtraAdjusting = 20;
                            }
                        }

                        await window.debug(debugMode, elementExtraAdjusting + ' px are extra adjustet');

                        tabNumberSpan.setAttribute(
                            'style',
                            'position: absolute; font-size:16px; font-weight: bold; background-color:red; width:30px; line-height: 18px; text-align: center; color:#fff; z-index: 2000; border-radius: 3px; left: ' +
                                (elementRect.right - 10) +
                                'px; top: ' +
                                (document.documentElement.scrollTop + elementRect.top + elementExtraAdjusting) +
                                'px',
                        );
                        alreadyMarkeds.push({ right: elementRect.right, top: elementRect.top });

                        tabNumberSpan.setAttribute('id', 'span_id' + i);
                        document.body.appendChild(tabNumberSpan);
                    };
                    const isElementVisible = async (element): Promise<boolean> => {
                        const tolerance = 0.01;
                        const percentX = 70;
                        const percentY = 70;
                        let currentDom = element;

                        const elementRect = currentDom.getBoundingClientRect();
                        const parentRects: DOMRect[] = [];

                        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
                        const viewWidth = Math.max(document.documentElement.clientWidth, window.innerWidth);
                        const elementVisible = !(
                            elementRect.bottom < 0 ||
                            elementRect.top - viewHeight >= 0 ||
                            elementRect.left < 0 ||
                            elementRect.right > viewWidth
                        );
                        if (!elementVisible) {
                            return false;
                        }

                        while (currentDom.parentElement != null) {
                            parentRects.push(currentDom.parentElement.getBoundingClientRect());
                            currentDom = currentDom.parentElement;
                        }

                        let ignoreOneNotInScope = false;
                        return parentRects.every(function (parentRect) {
                            const visiblePixelX =
                                Math.min(elementRect.right, parentRect.right) -
                                Math.max(elementRect.left, parentRect.left);
                            const visiblePixelY =
                                Math.min(elementRect.bottom, parentRect.bottom) -
                                Math.max(elementRect.top, parentRect.top);
                            const visiblePercentageX = (visiblePixelX / elementRect.width) * 100;
                            const visiblePercentageY = (visiblePixelY / elementRect.height) * 100;
                            const visibilityPerElement =
                                (visiblePercentageX + tolerance > percentX &&
                                    visiblePercentageY + tolerance > percentY) ||
                                parentRect.height === 0;
                            if (!visibilityPerElement && !ignoreOneNotInScope) {
                                ignoreOneNotInScope = true;
                                return true;
                            }
                            return visibilityPerElement;
                        });
                    };
                    const setBorderOfElement = (element: Element): void => {
                        if (element.getAttribute('style')) {
                            element.setAttribute(
                                'style',
                                element.getAttribute('style') + '; outline-style: solid; outline-color: red',
                            );
                        } else {
                            element.setAttribute('style', 'outline-style: solid; outline-color: red');
                        }
                    };
                    const elementsFromEvaluationParsed: ElementsFromEvaluation = JSON.parse(
                        elementsFromEvaluationInput,
                    );
                    const standardTags = ['A', 'AREA', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'DETAILS', 'IFRAME'];
                    if (elementsFromEvaluationParsed.elementsByVisibility.length === 0) {
                        window.scrollTo(0, 0);
                        const focusableElements = Array.from(
                            document.querySelectorAll(
                                'a[href], area[href], button, input, textarea, select, details, iframe, [tabindex]:not([tabindex^="-"])',
                            ),
                        ).filter(
                            (el) =>
                                !(el as HTMLElement).hasAttribute('disabled') &&
                                el.getClientRects().length > 0 &&
                                window.getComputedStyle(el).visibility !== 'hidden' &&
                                el.getAttribute('tabindex') !== '-1',
                        );
                        let i = 0;
                        let tabbingNumber = 1;
                        let firstVisibleElement = false;
                        let alreadyOneNotVisible = false;
                        for (const element of focusableElements) {
                            const elementVisible = await isElementVisible(element);
                            if (!element.id) {
                                element.setAttribute('id', 'id' + i);
                            }
                            if ((!elementVisible && firstVisibleElement) || alreadyOneNotVisible) {
                                elementsFromEvaluationParsed.elementsByVisibility.push({
                                    element: element.id,
                                    visible: elementVisible,
                                });
                                alreadyOneNotVisible = true;
                            } else {
                                setBorderOfElement(element);

                                const elementRect = element.getBoundingClientRect();
                                if (elementVisible) {
                                    await doIt(elementRect, tabbingNumber);
                                    if (!standardTags.includes(element.tagName.toUpperCase())) {
                                        const spanElement = document.getElementById('span_id' + tabbingNumber);
                                        if (spanElement) {
                                            spanElement.innerHTML = spanElement.innerHTML + 'C';
                                            elementsFromEvaluationParsed.focusableNonStandardElements.push(element.id);
                                        }
                                    }
                                    tabbingNumber++;
                                }

                                if (elementVisible && !firstVisibleElement) {
                                    firstVisibleElement = true;
                                }

                                elementsFromEvaluationParsed.elementsByVisibility.push({
                                    element: element.id,
                                    visible: elementVisible,
                                });
                                await window.debug(
                                    debugMode,
                                    element.tagName + ' is visible: ' + elementVisible + 'and got number' + i,
                                );
                            }
                            i++;
                        }
                        elementsFromEvaluationParsed.currentIndex = tabbingNumber;
                    } else {
                        const elementsToRemove: number[] = [];
                        let firstVisibleElement = false;
                        let i = 0;
                        let tabbingNumber = elementsFromEvaluationParsed.currentIndex;
                        for (const elementSelector of elementsFromEvaluationParsed.elementsByVisibility) {
                            const element = document.getElementById(elementSelector.element);
                            if (element) {
                                let elementVisible = await isElementVisible(element);
                                let k = 0;

                                while (!elementVisible && k < 10 && !firstVisibleElement) {
                                    if (k > 0) await new Promise((resolve) => setTimeout(resolve, 200));

                                    elementVisible = await isElementVisible(element);

                                    if (!elementVisible) element.scrollIntoView();
                                    k++;
                                    console.log('step: ' + k);
                                }
                                console.log('elementSelector' + elementSelector + 'visibility' + elementVisible);

                                if (elementVisible && !firstVisibleElement) {
                                    firstVisibleElement = true;
                                    console.log('i am here elementnumer:' + tabbingNumber);
                                    const oldElementsToRemove = Array.from(document.querySelectorAll('[id^=span_id]'));
                                    for (const oldElement of oldElementsToRemove) {
                                        oldElement.remove();
                                    }
                                    const oldElementsWithBorder = Array.from(
                                        document.querySelectorAll('[style="outline-style: solid; outline-color: red"]'),
                                    );
                                    for (const oldElement of oldElementsWithBorder) {
                                        const oldElementStyle = oldElement.getAttribute('style');
                                        if (oldElementStyle) {
                                            oldElement.setAttribute(
                                                'style',
                                                oldElementStyle.replace('outline-style: solid; outline-color: red', ''),
                                            );
                                        }
                                    }
                                }
                                if (elementVisible) {
                                    setBorderOfElement(element);
                                    const elementRect = element.getBoundingClientRect();
                                    await doIt(elementRect, tabbingNumber);
                                    elementSelector.visible = true;
                                    if (!standardTags.includes(element.tagName.toUpperCase())) {
                                        const spanElement = document.getElementById('span_id' + tabbingNumber);
                                        if (spanElement) {
                                            spanElement.innerHTML = spanElement.innerHTML + 'C';
                                            elementsFromEvaluationParsed.focusableNonStandardElements.push(element.id);
                                        }
                                    }
                                    tabbingNumber++;
                                } else if (!elementVisible && !firstVisibleElement) {
                                    elementsToRemove.push(i);
                                } else if (!elementVisible && firstVisibleElement) {
                                    break;
                                }
                            }
                            i++;
                        }
                        elementsFromEvaluationParsed.currentIndex = tabbingNumber;
                        for (const elmToSPlice of elementsToRemove) {
                            elementsFromEvaluationParsed.elementsByVisibility.splice(elmToSPlice, 1);
                        }
                    }
                    return JSON.stringify(elementsFromEvaluationParsed);
                },
                config.debugMode,
                JSON.stringify(elementsFromEvaluation),
            ),
        );
        const imageName = imageId + '_' + runs + '.png';
        await saveScreenshot(page, config.imagesPath, imageName, true, config.debugMode);
        urlResult.tabableImages.push(imageName);
        runs++;
        elementsFromEvaluation.elementsByVisibility = elementsFromEvaluation.elementsByVisibility.filter(
            (f) => f.visible !== true,
        );
    }
}
