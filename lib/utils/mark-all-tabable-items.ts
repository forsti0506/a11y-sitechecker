import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error, getEscaped } from './helper-functions';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { isElementVisible, elementIntersected, highestZIndex } from './is-element-visible';
import { exposeDepsJs } from './expose-deep-js';
import { saveScreenshotSingleDomElement } from './helper-saving-screenshots';

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;
        isElementVisible(dom: string | null): boolean;
        highestZIndex(): number;
    }
}

export async function markAllTabableItems(
    page: Page,
    url: string,
    config: Config,
    urlResult: ResultByUrl,
    events?: any,
): Promise<void> {
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
        let tabItemCount = 0;
        // selecting all focusable elements in the tabbing order
        return Array.from(
            document.querySelectorAll(
                'a[href], area[href], button, input, textarea, select, details, iframe, [tabindex]:not([tabindex^="-"])',
            ),
        )
            .filter(
                (el) =>
                    !(el as HTMLElement).hasAttribute('disabled') &&
                    el.getClientRects().length > 0 &&
                    window.getComputedStyle(el).visibility !== 'hidden' &&
                    el.getAttribute('tabindex') !== '-1',
            )
            .sort((el1, el2) => {
                return (
                    Number.parseInt(el1.getAttribute('tabindex') || '0') -
                    Number.parseInt(el2.getAttribute('tabindex') || '0')
                );
            })
            .map((el) => {
                if (!el.id) {
                    el.id = 'tabitem' + tabItemCount;
                    tabItemCount++;
                }
                return '#' + el.id;
            });
    });

    for (const [i, focusableElement] of focusableElements.entries()) {
        const image = getEscaped(url) + '_' + i + '.png';
        await page.evaluate(
            async (focusableElement, i, debugMode) => {
                const element = document.querySelector(focusableElement);
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
                const tabNumberText = document.createTextNode(i.toString());
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
            },
            focusableElement,
            i,
            config.debugMode,
        );
        const screenshotResult = await saveScreenshotSingleDomElement(
            page,
            config.imagesPath,
            image,
            config.saveImages,
            focusableElement,
            10,
            config.debugMode,
        );
        await page.evaluate((i) => {
            document.querySelector('#span_id' + i)?.remove();
        }, i);
        if (typeof screenshotResult === 'boolean' && screenshotResult === true) {
            urlResult.tabableImages.push(image);
        } else if (typeof screenshotResult === 'string') {
            urlResult.tabableImages.push(screenshotResult);
        }
    }
}
