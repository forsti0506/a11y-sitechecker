import { Config } from './../models/config';
import { Page, Protocol } from 'puppeteer';
import { debug } from './helper-functions';
import { getSelector, getUniqueSelector, uniqueQuery } from './unique-selector';
import { exposeDepsJs } from './expose-deep-js';

export async function markAllEvents(page: Page, config: Config): Promise<{ [key: string]: string[] }> {
    debug(config.debugMode, 'mark all events for ' + page.url());

    await page.evaluate(exposeDepsJs({ getUniqueSelector }));
    await page.evaluate(exposeDepsJs({ uniqueQuery }));
    await page.evaluate(exposeDepsJs({ getSelector }));

    const allElements: string[] = JSON.parse(
        await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            return JSON.stringify(allElements.map((f) => window.getUniqueSelector(f).replace(/"/gi, "'")));
        }),
    );
    const result: { [key: string]: string[] } = {};
    const client = await page.target().createCDPSession();
    for (const element of allElements) {
        const expression = 'document.querySelector("' + element + '")';
        const nodeObject = (
            await client.send('Runtime.evaluate', {
                expression: expression,
            })
        ).result;
        if (nodeObject.objectId) {
            const eventListenersCdp = await client.send('DOMDebugger.getEventListeners', {
                objectId: nodeObject.objectId,
            });
            const eventListeners: Protocol.DOMDebugger.EventListener[] = eventListenersCdp.listeners;
            if (eventListeners.length > 0) {
                eventListeners.forEach((eventListener: Protocol.DOMDebugger.EventListener) => {
                    if (result[eventListener.type]) {
                        result[eventListener.type].push(element);
                    } else {
                        result[eventListener.type] = [element];
                    }
                });
            }
        }
    }
    return result;
}
