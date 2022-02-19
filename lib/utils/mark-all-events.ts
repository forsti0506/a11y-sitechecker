import { Config } from './../models/config';
import { Page, Protocol } from 'puppeteer';
import { debug } from './helper-functions';

export async function markAllEvents(page: Page, config: Config): Promise<{ [key: string]: string[] }> {
    debug(config.debugMode, 'mark all events for ' + page.url());
    const allElements: string[] = JSON.parse(
        await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const [i, element] of allElements.entries()) {
                if (!element.id) {
                    element.setAttribute('id', 'listenerId' + i.toString());
                }
            }
            return JSON.stringify(allElements.map((f) => f.id));
        }),
    );
    const res: { [key: string]: string[] } = {};
    const client = await page.target().createCDPSession();
    for (const element of allElements) {
        const expression = 'document.getElementById("' + element + '")';
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
                    if (res[eventListener.type]) {
                        res[eventListener.type].push(element);
                    } else {
                        res[eventListener.type] = [element];
                    }
                });
            }
        }
    }
    return res;
}
