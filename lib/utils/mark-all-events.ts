// future release maybe to mark all events on a side!
import { Page } from 'puppeteer';

export async function markAllEvents(page: Page): Promise<void> {
    const allElements = JSON.parse(
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
    const res: { node: HTMLElement; events: Event[] }[] = [];
    const client = await page.target().createCDPSession();
    for (const [i, element] of allElements.entries()) {
        const expression = 'document.getElementById("' + element + '")';
        const nodeObject = ((await client.send('Runtime.evaluate', {
            // eslint-disable-next-line
            expression: expression,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any).result;
        console.log(i + ' ' + nodeObject.objectId);
        const eventListenersCdp = await client.send('DOMDebugger.getEventListeners', {
            objectId: nodeObject.objectId,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventListeners = (eventListenersCdp as any).listeners;
        const eventTypes = Object.keys(eventListeners);
        if (eventTypes.length !== 0) {
            const events = [];
            eventTypes.forEach((eventType) => {
                events[eventType] = eventListeners[eventType].type;
            });
            res.push({
                node: element,
                events: events,
            });
        }
    }
}
