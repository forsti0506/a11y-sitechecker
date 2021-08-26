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
    urlResult: ResultByUrl
): Promise<void> {
    debug(config.debugMode, 'make screens for tabable items');
    try {
        await page.exposeFunction('debug', debug);
    } catch (e) {
        if (config.debugMode) {
            error(
                e.message +
                    '. Ignored because normally it means that function already exposed'
            );
        }
    }
    let runs = 0;
    let elementsFromEvaluation: ElementsFromEvaluation = {
        focusableNonStandardElements: [],
        elementsByVisibility: [],
        currentIndex: 0
    };
    const imageId = uuidv4();
    while (runs === 0 || elementsFromEvaluation.elementsByVisibility.length > 0) {
        elementsFromEvaluation = JSON.parse(
            await page.evaluate(
                async (debugMode, elementsFromEvaluationInput) => {
                    const alreadyMarkeds: { top: number; right: number }[] = [];
                    const doIt = async (
                        elementRect: DOMRect,
                        i: number
                    ): Promise<void> => {
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

                        window.debug(
                            debugMode,
                            elementExtraAdjusting + ' px are extra adjustet'
                        );

                        tabNumberSpan.setAttribute(
                            'style',
                            'position: absolute; font-size:16px; font-weight: bold; background-color:red; width:30px; line-height: 18px; text-align: center; color:#fff; z-index: 2000; border-radius: 3px; left: ' +
                                (elementRect.right - 10) +
                                'px; top: ' +
                                (document.documentElement.scrollTop +
                                    elementRect.top +
                                    elementExtraAdjusting) +
                                'px'
                        );
                        alreadyMarkeds.push({
                            right: elementRect.right,
                            top: elementRect.top
                        });

                        tabNumberSpan.setAttribute('id', 'span_id' + i);
                        document.body.appendChild(tabNumberSpan);
                    };
                    const isElementVisible = async (element): Promise<boolean> => {
                        const tolerance = 0.01;
                        const percentX = 90;
                        const percentY = 90;
                        let currentDom = element;

                        const elementRect = currentDom.getBoundingClientRect();
                        const parentRects: DOMRect[] = [];

                        const viewHeight = Math.max(
                            document.documentElement.clientHeight,
                            window.innerHeight
                        );
                        const viewWidth = Math.max(
                            document.documentElement.clientWidth,
                            window.innerWidth
                        );
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
                            parentRects.push(
                                currentDom.parentElement.getBoundingClientRect()
                            );
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
                            const visiblePercentageX =
                                (visiblePixelX / elementRect.width) * 100;
                            const visiblePercentageY =
                                (visiblePixelY / elementRect.height) * 100;
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
                                element.getAttribute('style') +
                                    '; outline: 5px dotted violet'
                            );
                        } else {
                            element.setAttribute('style', 'outline: 5px dotted violet');
                        }
                    };
                    const elementsFromEvaluationParsed: ElementsFromEvaluation =
                        JSON.parse(elementsFromEvaluationInput);
                    const standardTags = [
                        'A',
                        'AREA',
                        'BUTTON',
                        'INPUT',
                        'TEXTAREA',
                        'SELECT',
                        'DETAILS',
                        'IFRAME'
                    ];
                    if (elementsFromEvaluationParsed.elementsByVisibility.length === 0) {
                        window.scrollTo(0, 0);
                        const focusableElements = Array.from(
                            document.querySelectorAll(
                                'a[href], area[href], button, input, textarea, select, details, iframe, [tabindex]:not([tabindex^="-"])'
                            )
                        ).filter(
                            (el) =>
                                !(el as HTMLElement).hasAttribute('disabled') &&
                                el.getClientRects().length > 0 &&
                                window.getComputedStyle(el).visibility !== 'hidden' &&
                                el.getAttribute('tabindex') !== '-1'
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
                            if (
                                (!elementVisible && firstVisibleElement) ||
                                alreadyOneNotVisible
                            ) {
                                elementsFromEvaluationParsed.elementsByVisibility.push({
                                    element: element.id,
                                    visible: false
                                });
                                alreadyOneNotVisible = true;
                            } else {
                                setBorderOfElement(element);

                                const elementRect = element.getBoundingClientRect();
                                if (elementVisible) {
                                    await doIt(elementRect, tabbingNumber);
                                    if (
                                        !standardTags.includes(
                                            element.tagName.toUpperCase()
                                        )
                                    ) {
                                        const spanElement = document.getElementById(
                                            'span_id' + tabbingNumber
                                        );
                                        if (spanElement) {
                                            spanElement.innerHTML =
                                                spanElement.innerHTML + 'C';
                                            elementsFromEvaluationParsed.focusableNonStandardElements.push(
                                                element.id
                                            );
                                        }
                                    }
                                    tabbingNumber++;
                                    elementsFromEvaluationParsed.elementsByVisibility.push(
                                        {
                                            element: element.id,
                                            visible: elementVisible
                                        }
                                    );
                                }

                                if (elementVisible && !firstVisibleElement) {
                                    firstVisibleElement = true;

                                    //scroll down here maybe too
                                }
                                window.debug(
                                    debugMode,
                                    element.tagName +
                                        ' is visible: ' +
                                        elementVisible +
                                        ' and got number ' +
                                        i
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
                            const element = document.getElementById(
                                elementSelector.element
                            );
                            if (element) {
                                console.log(JSON.stringify(element.classList));
                                let elementVisible = await isElementVisible(element);
                                let k = 0;

                                while (
                                    !elementVisible &&
                                    k < 10 &&
                                    !firstVisibleElement
                                ) {
                                    if (k > 0)
                                        await new Promise((resolve) =>
                                            setTimeout(resolve, 200)
                                        );

                                    elementVisible = await isElementVisible(element);

                                    if (!elementVisible) element.scrollIntoView();
                                    k++;
                                }
                                console.log(
                                    'elementSelector: ' +
                                        JSON.stringify(elementSelector) +
                                        ', visibility ' +
                                        elementVisible
                                );

                                if (elementVisible && !firstVisibleElement) {

                                    element.scrollIntoView();

                                    firstVisibleElement = true;
                                    const oldElementsToRemove = Array.from(
                                        document.querySelectorAll('[id^=span_id]')
                                    );
                                    for (const oldElement of oldElementsToRemove) {
                                        oldElement.remove();
                                    }
                                    const oldElementsWithBorder = Array.from(
                                        document.querySelectorAll(
                                            '[style*="outline: 5px dotted violet"]'
                                        )
                                    );
                                    for (const oldElement of oldElementsWithBorder) {
                                        const oldElementStyle =
                                            oldElement.getAttribute('style');
                                        if (oldElementStyle) {
                                            oldElement.setAttribute(
                                                'style',
                                                oldElementStyle.replace(
                                                    'outline: 5px dotted violet',
                                                    ''
                                                )
                                            );
                                        }
                                    }

                                    const elementRect = element.getBoundingClientRect();
                                    let adjustScrollingBehindFixed = 0;
                                    const elementIntersected = Array.from(
                                        document.body.getElementsByTagName('*')
                                    )
                                        .filter(
                                            (x) =>
                                                getComputedStyle(
                                                    x,
                                                    null
                                                ).getPropertyValue('position') === 'fixed'
                                        )
                                        .some((fixedElem) => {
                                            const fixedElementClientRect =
                                                fixedElem.getBoundingClientRect();
                                            const isIntersected = !(
                                                elementRect.top >
                                                    fixedElementClientRect.bottom ||
                                                elementRect.right <
                                                    fixedElementClientRect.left ||
                                                elementRect.bottom <
                                                    fixedElementClientRect.top ||
                                                elementRect.left >
                                                    fixedElementClientRect.right
                                            );
                                            if (
                                                isIntersected &&
                                                fixedElementClientRect.height + elementRect.height>
                                                    adjustScrollingBehindFixed + elementRect.height
                                            ) {
                                                adjustScrollingBehindFixed =
                                                    fixedElementClientRect.height + elementRect.height;
                                            }
                                            return isIntersected;
                                        });

                                    console.log(
                                        'element (' +
                                            element.tagName +
                                            ') is intersected by fixed: ' +
                                            elementIntersected +
                                            ' height: ' +
                                            adjustScrollingBehindFixed
                                    );
                                    if (elementIntersected) {
                                        window.scrollBy(0, -adjustScrollingBehindFixed);
                                    }
                                }
                                if (elementVisible) {
                                    setBorderOfElement(element);
                                    const elementRect = element.getBoundingClientRect();
                                    await doIt(elementRect, tabbingNumber);
                                    elementSelector.visible = true;
                                    if (
                                        !standardTags.includes(
                                            element.tagName.toUpperCase()
                                        )
                                    ) {
                                        const spanElement = document.getElementById(
                                            'span_id' + tabbingNumber
                                        );
                                        if (spanElement) {
                                            spanElement.innerHTML =
                                                spanElement.innerHTML + 'C';
                                            elementsFromEvaluationParsed.focusableNonStandardElements.push(
                                                element.id
                                            );
                                        }
                                    }
                                    tabbingNumber++;
                                } else if (!elementVisible && !firstVisibleElement) {
                                    elementsToRemove.push(i);
                                } else if (!elementVisible && firstVisibleElement) {
                                    break;
                                }
                            } else {
                                console.debug(
                                    'Not defined Element removed with number: ' + i
                                );
                                elementsToRemove.push(i);
                            }
                            i++;
                        }
                        elementsFromEvaluationParsed.currentIndex = tabbingNumber;
                        for (const elmToSplice of elementsToRemove) {
                            elementsFromEvaluationParsed.elementsByVisibility.splice(
                                elmToSplice,
                                1
                            );
                        }
                    }
                    return JSON.stringify(elementsFromEvaluationParsed);
                },
                config.debugMode,
                JSON.stringify(elementsFromEvaluation)
            )
        );
        const imageName = imageId + '_' + runs + '.png';
        await saveScreenshot(
            page,
            config.imagesPath,
            imageName,
            config.saveImages,
            config.debugMode
        );
        urlResult.tabableImages.push(imageName);
        runs++;
        elementsFromEvaluation.elementsByVisibility =
            elementsFromEvaluation.elementsByVisibility.filter((f) => f.visible !== true);
    }
}
