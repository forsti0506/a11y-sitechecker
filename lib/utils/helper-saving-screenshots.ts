import { Page } from 'puppeteer';
import { debug, log } from './helper-functions';

export async function saveScreenshotSingleDomElement(
    page: Page,
    path: string | undefined,
    fileName: string | undefined,
    saveImage: boolean | undefined,
    selector: string,
    padding?: number,
    debugMode = false
): Promise<boolean | Buffer | string> {
    if (saveImage) {
        try {
            padding = padding || 0;

            const rectString: string | undefined = await page.evaluate(async (selector, debugMode) => {
                const element = document.querySelector(selector);
                if (!element) return undefined;
                const elementVisible = window.isElementVisible(selector);
                window.debug(debugMode, JSON.stringify(element.getBoundingClientRect()));
                if (!elementVisible) {
                    const oldScrollValues = {x: window.scrollX, y: window.scrollY};
                    window.debug(
                        debugMode,
                        'Element not visible. Try to scroll into view'
                    );
                    element.scrollIntoViewIfNeeded(true);
                    const newScrollValues = {x: window.scrollX, y: window.scrollY};
                    window.debug(debugMode, 'Old scroll values ' + JSON.stringify(oldScrollValues) + ' vs new ones: ' + JSON.stringify(newScrollValues));
                    
                    if(oldScrollValues !== newScrollValues) {
                        await new Promise((resolve) => setTimeout(resolve, 200));
                        if(!window.isElementVisible(selector)) {
                            await new Promise((resolve) => setTimeout(resolve, 2000)); 
                        }
                        window.scrollTo(0,0);
                        await new Promise((resolve) => setTimeout(resolve, 200));
                    }
                    
                    return JSON.stringify(element.getBoundingClientRect());
                }
                return JSON.stringify(element.getBoundingClientRect());
            }, selector, debugMode);

            if (!rectString) {
                log(
                    'Screenshot Single Element failed, because selector (' +
                        selector +
                        ') not found'
                );
                return false;
            } else {
                const rect = JSON.parse(rectString);

                if(rect.width <= 0 || rect.height <= 0) {
                    log(
                        'Screenshot Single Element failed, because selector (' +
                            selector +
                            ') not visible'
                    );
                    return false; 
                }

                const pathWithFile = getPathWithFileName(path, fileName);
                await page.screenshot({
                    path: pathWithFile,
                    clip: {
                        x: rect.left - padding,
                        y: rect.top - padding,
                        width: rect.width + padding * 2,
                        height: rect.height + padding * 2
                    }
                });
                debug(debugMode, pathWithFile + ' saved');
                
                return true;
                
            }
        } catch (error) {
            log(error + '. Image not saved. Analyze not stopped!');
            return false;
        }
    } {
        return false;
    }
}

export async function saveScreenshot(
    page: Page,
    path: string | undefined,
    fileName: string | undefined,
    saveImage: boolean | undefined,
    debugMode = false
): Promise<void | Buffer | string> {
    if (saveImage) {
        try {
            if (!path?.endsWith('/')) {
                path = path + '/';
            }
            const pathWithFile = getPathWithFileName(path, fileName);
            const fileBufferOrVoid = await page.screenshot({ path: pathWithFile });
            debug(debugMode, pathWithFile + ' saved');
            return fileBufferOrVoid;
        } catch (error) {
            log(error + '. Image not saved. Analyze not stopped!');
        }
    }
}

function getPathWithFileName(
    path: string | undefined,
    fileName: string | undefined
): string | undefined {
    if (path && fileName) {
        return path + fileName;
    }
    return undefined;
}
