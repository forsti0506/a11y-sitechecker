import { Page } from 'puppeteer';
import { Config } from '../models/config';
import { debug, error } from './helper-functions';
import { v4 as uuidv4 } from 'uuid';
import { ElementsFromEvaluation } from '../models/small-ones';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { PuppeteerScreenRecorder, VideoOptions } from 'puppeteer-screen-recorder';
import { isElementVisible, elementIntersected, highestZIndex } from './is-element-visible';
import { exposeDepsJs } from './expose-deep-js';

declare global {
    interface Window {
        debug(debugMode: boolean, message: string, ...optionalParams: unknown[]): void;
        isElementVisible (
            dom: string | null
        ): boolean;
        highestZIndex () : number;
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
    } catch (e: any) {
        if (config.debugMode) {
            error(
                e.message +
                    '. Ignored because normally it means that function already exposed'
            );
        }
    }
    await page.evaluate(exposeDepsJs({ isElementVisible }));
    await page.evaluate(exposeDepsJs({ highestZIndex }));
    await page.evaluate(exposeDepsJs({ elementIntersected }));

    let runs = 0;
    let elementsFromEvaluation: ElementsFromEvaluation = {
        focusableNonStandardElements: [],
        elementsByVisibility: [],
        currentIndex: 0,
        spanElements: []
    };
    let oldIndex = -1;
    const imageId = uuidv4();
    while (elementsFromEvaluation.currentIndex > oldIndex) {
        oldIndex = elementsFromEvaluation.currentIndex;
        elementsFromEvaluation = JSON.parse(
            await page.evaluate(
                async (debugMode, elementsFromEvaluationInput) => {
                    // Update elements positions for scrolling

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

                    const addSpanForTabbingNumber = async (
                        element: Element,
                        i: number
                    ): Promise<void> => {
                        const tabNumberSpan = document.createElement('SPAN');
                        const tabNumberText = document.createTextNode(i.toString());
                        const elementRect = element.getBoundingClientRect();
                        tabNumberSpan.appendChild(tabNumberText);
                        elementsFromEvaluationParsed.elementsByVisibility.push(
                            element.id
                        );

                        tabNumberSpan.classList.add('tabCircleOuter');

                        tabNumberSpan.setAttribute('id', 'span_id' + i);
                        const isTabVisible = window.isElementVisible(element.id);
                        tabNumberSpan.setAttribute(
                            'style',
                            'left: ' +
                                elementRect.left +
                                'px; top: ' +
                                elementRect.top +
                                'px; z-index: ' +
                                (window.highestZIndex() || 1) +
                                (isTabVisible ? '' : '; display: none')
                                );
                        elementsFromEvaluationParsed.spanElements.push({
                            elementId: element.id,
                            spanId: tabNumberSpan.id,
                            visible: isTabVisible
                        });
                        document.body.appendChild(tabNumberSpan);
                    };

                    const setBorderOfElement = (element: Element): void => {
                        if (element.getAttribute('style')) {
                            element.setAttribute(
                                'style',
                                element.getAttribute('style') +
                                    '; outline: 5px dotted violet; outline-offset: -5px;'
                            );
                        } else {
                            element.setAttribute(
                                'style',
                                'outline: 5px dotted violet; outline-offset: -5px;'
                            );
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

                    //start normal

                    //just to ensure position
                    window.scrollTo(0, 0);
                    let focusableElements = Array.from(
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
                    if (elementsFromEvaluationParsed.elementsByVisibility.length > 0) {
                        focusableElements = focusableElements.filter(
                            (f) =>
                                !elementsFromEvaluationParsed.elementsByVisibility.includes(
                                    f.id
                                )
                        );
                    }

                    let tabbingNumber =
                        elementsFromEvaluationParsed.currentIndex === -1
                            ? 1
                            : elementsFromEvaluationParsed.currentIndex;
                    for (const element of focusableElements) {
                        if (!element.id) {
                            element.setAttribute('id', 'id' + tabbingNumber);
                        }

                        setBorderOfElement(element);

                        await addSpanForTabbingNumber(element, tabbingNumber);
                        // element.classList.add('tabcircle');
                        if (!standardTags.includes(element.tagName.toUpperCase())) {
                            const spanElement = document.getElementById(
                                'span_id' + tabbingNumber
                            );
                            if (spanElement) {
                                spanElement.innerHTML = spanElement.innerHTML + 'C';
                                elementsFromEvaluationParsed.focusableNonStandardElements.push(
                                    element.id
                                );
                            }
                        }
                        tabbingNumber++;
                        if (
                            !elementsFromEvaluationParsed.elementsByVisibility.includes(
                                element.id
                            )
                        ) {
                            elementsFromEvaluationParsed.elementsByVisibility.push(
                                element.id
                            );
                        }
                    }
                    elementsFromEvaluationParsed.currentIndex = tabbingNumber;

                    return JSON.stringify(elementsFromEvaluationParsed);
                },
                config.debugMode,
                JSON.stringify(elementsFromEvaluation)
            )
        );
        if (oldIndex < elementsFromEvaluation.currentIndex) {
            const screenConfig: VideoOptions = {
                aspectRatio: '16:9'
            };
            const recorder = new PuppeteerScreenRecorder(page, screenConfig);
            let savePath = config.imagesPath;
            if (!savePath?.endsWith('/')) {
                savePath = savePath + '/';
            }
            await recorder.start(savePath + imageId + '_' + runs + '.mp4');

            elementsFromEvaluation = JSON.parse(await page.evaluate(async (elementsFromEvaluationInput) => {
                let scroll = true;
                await new Promise((resolve) => setTimeout(resolve, 2500));
                const elementsFromEvaluationParsed: ElementsFromEvaluation = JSON.parse(elementsFromEvaluationInput);
                while (scroll) {
                    window.scroll(0, window.scrollY + window.innerHeight - window.innerHeight/3);
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    elementsFromEvaluationParsed.spanElements.forEach(
                        (s) => {
                            const isVisible = window.isElementVisible(s.elementId);
                            if(isVisible !== s.visible) {
                                console.log('Visibility changed ' + s.elementId)
                                s.visible = isVisible;
                                document
                                .getElementById(s.spanId)
                                ?.setAttribute(
                                    'style',
                                    'top: ' +
                                        (window.scrollY +
                                            (document
                                                .getElementById(s.elementId)
                                                ?.getBoundingClientRect()
                                                .top || 0)) +
                                        'px; left: ' +
                                        document
                                            .getElementById(s.elementId)
                                            ?.getBoundingClientRect().left +
                                        'px; z-index: ' +
                                        (window.highestZIndex() || 1) + (isVisible ? '' : '; display: none')
                                );
                            }
                            
                        }
                    );
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    if (
                        window.innerHeight + window.pageYOffset >=
                        document.body.offsetHeight
                    ) {
                        scroll = false;
                    }
                }
                return JSON.stringify(elementsFromEvaluationParsed);
            }, JSON.stringify(elementsFromEvaluation)));
            await recorder.stop();
            urlResult.tabableImages.push(savePath);
        }
        runs++;
    }
}
