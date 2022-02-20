import { Config, SitecheckerViewport } from '../models/config';
import { Browser, Page } from 'puppeteer';
import { debug, log, waitForHTML } from './helper-functions';
import { analyzeSite } from './analyze-site';
import { setupAxe } from './setup-config';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Spec } from 'axe-core';
import { createUrlResult } from './create-url-result';

const alreadyClicked: Map<string, string[]> = new Map<string, string[]>();
export async function clickingElements(
    config: Config,
    url: string,
    page: Page,
    elementsToClick: Map<string, string[]>,
    axeSpecs: Spec,
    resultsByUrl: (ResultByUrl | null)[],
    browser: Browser,
    alreadyVisited: Map<string, SitecheckerViewport>,
    alreadyParsed: string[],
    notCheckedLinks: string[],
): Promise<void> {
    log(config.debugMode, 'All links of ' + url + ' visited. Now Clicking elements');
    await page.goto(url, { waitUntil: 'networkidle2' });
    await waitForHTML(page);

    const elToClick = elementsToClick.get(url);
    if (elToClick && elToClick.length > 0) {
        for (const [i, element] of elToClick.entries()) {
            debug(config.debugMode, 'Clicking ' + i + ' of ' + elToClick.length);
            if (element && !alreadyClicked.get(url)?.includes(element)) {
                debug(config.debugMode, 'Element to be clicked: ' + element);
                try {
                    const alrdyClicked = alreadyClicked.get(url);
                    if (alrdyClicked) {
                        alrdyClicked.push(element);
                    } else {
                        alreadyClicked.set(url, [url]);
                    }
                    await page.evaluate((element) => {
                        (document.querySelector(element) as HTMLElement).click();
                    }, element);
                    await waitForHTML(page);
                } catch (e) {
                    debug(config.debugMode, 'Seems like element not found. ' + e);
                }
                try {
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });
                    await waitForHTML(page);
                    await analyzeSite(
                        axeSpecs,
                        page,
                        config,
                        resultsByUrl,
                        browser,
                        alreadyVisited,
                        alreadyParsed,
                        notCheckedLinks,
                        page.url(),
                    );
                } catch (e) {
                    log('seems like click was no navigation. Analyze and do it. ' + e);
                    await waitForHTML(page);
                    if (page.url() !== url && !alreadyVisited.get(url)) {
                        await analyzeSite(
                            axeSpecs,
                            page,
                            config,
                            resultsByUrl,
                            browser,
                            alreadyVisited,
                            alreadyParsed,
                            notCheckedLinks,
                            page.url(),
                        );
                        await page.goto(url, { waitUntil: 'load' });
                        await waitForHTML(page);
                    } else if (config.analyzeClicksWithoutNavigation) {
                        debug(config.debugMode, 'Experimental feature! Please check if there are too many clicks!');
                        const axe = await setupAxe(page, axeSpecs, config);
                        const axeResults = await axe.analyze();
                        resultsByUrl.push(await createUrlResult(url + '_' + element + '_clicked', axeResults));
                    }
                }
            }
        }
    }
}
