import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, getEscaped } from './helper-functions';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { isElementVisible, elementIntersected, highestZIndex } from './is-element-visible';
import { exposeDepsJs } from './expose-deep-js';
import { saveScreenshotSingleDomElement } from './helper-saving-screenshots';
import JSDOM from 'jsdom';
import { getSelector, getUniqueSelector, uniqueQuery } from './unique-selector';

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;

        isElementVisible(dom: string | null): boolean;

        highestZIndex(): number;

        getUniqueSelector(elSrc: Node, dom?: JSDOM.JSDOM): string;
    }
}

function getStandardHTMLTags() {
    return ['a', 'area', 'button', 'input', 'textarea', 'select', 'details', 'iframe'];
}

function isElementMaybeVisible(el: Element): unknown {
    return (
        !(el as HTMLElement).hasAttribute('disabled') &&
        el.getClientRects().length > 0 &&
        window.getComputedStyle(el).visibility !== 'hidden' &&
        el.getAttribute('tabindex') !== '-1'
    );
}

export async function markAllTabableItems(
    page: Page,
    url: string,
    config: Config,
    urlResult: ResultByUrl,
    events: { [key: string]: string[] },
): Promise<void> {
    try {
        debug(config.debugMode, 'make screens for tabable items');
        try {
            await page.exposeFunction('debug', debug);
        } catch (e: any) {
            if (config.debugMode) {
                error(e.message + '. Ignored because normally it means that function already exposed');
            }
        }
        await page.evaluate(exposeDepsJs({ isElementVisible }));
        await page.evaluate(exposeDepsJs({ highestZIndex }));
        await page.evaluate(exposeDepsJs({ elementIntersected }));

        await page.evaluate(exposeDepsJs({ getUniqueSelector }));
        await page.evaluate(exposeDepsJs({ uniqueQuery }));
        await page.evaluate(exposeDepsJs({ getSelector }));

        await page.evaluate(exposeDepsJs({ isElementMaybeVisible }));
        await page.evaluate(exposeDepsJs({ getStandardHTMLTags }));

        const focusableElements = await page.evaluate(() => {
            const styles = `
                        .tabCircleOuter {
                            position: absolute;
                            border-radius: 50%;
                            background: red;
                            color: white !important;
                            font-size: 18px !important;
                            padding: 5px;
                        }`;

            const styleSheet = document.createElement('style');
            styleSheet.id = 'tabId';
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);

            //just to ensure position
            window.scrollTo(0, 0);
            // selecting all focusable elements in the tabbing order
            return Array.from(
                document.querySelectorAll(
                    'a[href], area[href], button, input, textarea, select, details, iframe, [tabindex]:not([tabindex^="-"])',
                ),
            )
                .filter((el) => isElementMaybeVisible(el))
                .sort((el1, el2) => {
                    return (
                        Number.parseInt(el1.getAttribute('tabindex') || '0') -
                        Number.parseInt(el2.getAttribute('tabindex') || '0')
                    );
                })
                .map((el) => {
                    return window.getUniqueSelector(el);
                });
        });

        for (const [i, focusableElement] of focusableElements.entries()) {
            const image = getEscaped(url) + '_' + i + '.png';
            const resultFromEvaluation = await page.evaluate(
                async (focusableElement, i, debugMode, events) => {
                    const element:
                        | (Element & {
                              scrollIntoViewIfNeeded: any;
                          })
                        | null = document.querySelector(focusableElement);
                    const parsedEvents: { [key: string]: string[] } = JSON.parse(events);
                    if (!element) return;
                    const elementVisible = window.isElementVisible(focusableElement);
                    window.debug(debugMode, JSON.stringify(element.getBoundingClientRect()));
                    if (!elementVisible) {
                        const oldScrollValues = { x: window.scrollX, y: window.scrollY };
                        window.debug(debugMode, 'Element not visible. Try to scroll into view');
                        element.scrollIntoViewIfNeeded(true);
                        const newScrollValues = { x: window.scrollX, y: window.scrollY };
                        window.debug(
                            debugMode,
                            'Old scroll values ' +
                                JSON.stringify(oldScrollValues) +
                                ' vs new ones: ' +
                                JSON.stringify(newScrollValues),
                        );

                        if (oldScrollValues !== newScrollValues) {
                            await new Promise((resolve) => setTimeout(resolve, 200));
                            if (!window.isElementVisible(focusableElement)) {
                                await new Promise((resolve) => setTimeout(resolve, 2000));
                            }
                            window.scrollTo(0, 0);
                            await new Promise((resolve) => setTimeout(resolve, 200));
                        }
                    }

                    const tabNumberSpan = document.createElement('SPAN');
                    const clickEvent = parsedEvents['click']?.find((e) => e === focusableElement);
                    const keyPressEvent = parsedEvents['keypress']?.find((e) => e === focusableElement);
                    const keyDownEvent = parsedEvents['keydown']?.find((e) => e === focusableElement);
                    const keyUpEvent = parsedEvents['keyup']?.find((e) => e === focusableElement);

                    const result: { keyboardaccessible?: string; needsCheck?: string } = {};

                    let elementCorrectAccessible = true;

                    if (
                        (element.nodeName.toLowerCase() === 'a' || element.nodeName.toLowerCase() === 'area') &&
                        element.getAttribute('href') === ''
                    ) {
                        elementCorrectAccessible = !!(clickEvent && (keyPressEvent || keyDownEvent || keyUpEvent));
                    } else if (!getStandardHTMLTags().includes(element.nodeName.toLowerCase())) {
                        elementCorrectAccessible = !!(clickEvent && (keyPressEvent || keyDownEvent || keyUpEvent));
                    }

                    if (elementCorrectAccessible) {
                        result.keyboardaccessible = focusableElement;
                    } else {
                        result.needsCheck = focusableElement;
                    }

                    window.debug(debugMode, 'Element is correct accessible: ' + elementCorrectAccessible);
                    const tabNumberText = document.createTextNode(i.toString() + (elementCorrectAccessible ? '' : 'C'));
                    const elementRect = element.getBoundingClientRect();
                    tabNumberSpan.appendChild(tabNumberText);

                    tabNumberSpan.classList.add('tabCircleOuter');

                    tabNumberSpan.setAttribute('id', 'span_id' + i);
                    tabNumberSpan.setAttribute(
                        'style',
                        'left: ' +
                            window.scrollX +
                            elementRect.left +
                            'px; top: ' +
                            window.scrollY +
                            elementRect.top +
                            'px; z-index: ' +
                            (window.highestZIndex() || 1),
                    );
                    document.body.appendChild(tabNumberSpan);
                    return JSON.stringify(result || '');
                },
                focusableElement,
                i,
                config.debugMode,
                JSON.stringify(events),
            );

            const resultFromEvaluationParsed: { keyboardaccessible?: string; needsCheck?: string } | undefined =
                resultFromEvaluation ? JSON.parse(resultFromEvaluation) : undefined;

            if (resultFromEvaluationParsed && resultFromEvaluationParsed.needsCheck) {
                urlResult.needsCheck.push(resultFromEvaluationParsed.needsCheck);
            }

            if (resultFromEvaluationParsed && resultFromEvaluationParsed.keyboardaccessible) {
                urlResult.keyboardAccessibles.push(resultFromEvaluationParsed.keyboardaccessible);
            }

            const valueToRemove =
                resultFromEvaluationParsed?.needsCheck || resultFromEvaluationParsed?.keyboardaccessible;

            if (valueToRemove && Object.prototype.hasOwnProperty.call(events, 'click')) {
                events['click'] = events['click'].filter((c) => c !== valueToRemove);
            }

            const screenshotResult = await saveScreenshotSingleDomElement(
                page,
                config.imagesPath,
                image,
                config.saveImages,
                focusableElement,
                config.screenshotPadding || 10,
                config.debugMode,
            );
            await page.evaluate((i) => {
                document.querySelector('#span_id' + i)?.remove();
            }, i);
            if (typeof screenshotResult === 'boolean' && screenshotResult) {
                urlResult.tabableImages.push(image);
            } else if (typeof screenshotResult === 'string') {
                urlResult.tabableImages.push(screenshotResult);
            }
        }

        if (Object.prototype.hasOwnProperty.call(events, 'click')) {
            for (const clickEvent of events['click']) {
                const notFocusableClickable = await page.evaluate((clickEvent) => {
                    const clickElement = document.querySelector(clickEvent);
                    if (
                        clickElement &&
                        isElementMaybeVisible(clickElement) &&
                        !getStandardHTMLTags().includes(clickElement.tagName.toLowerCase())
                    ) {
                        return clickEvent;
                    }
                    return null;
                }, clickEvent);
                if (notFocusableClickable) {
                    urlResult.notFocusableClickables.push(notFocusableClickable);
                }
            }
        }
    } catch (e) {
        debugger;
    }
}
