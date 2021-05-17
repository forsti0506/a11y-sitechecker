import { Spec } from 'axe-core';
import { Config, SitecheckerViewport } from '../models/config';
import { debug, error, getEscaped, log, saveScreenshot, waitForHTML } from './helper-functions';
import { markAllTabableItems } from './mark-all-tabable-items';
import { setupAxe } from './setup-config';
import { Page } from 'puppeteer';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { makeScreenshotsWithErrorsBorderd } from './make-sreenshots-with-errors-borderd';
import { createUrlResult } from './create-url-result';

const savedScreenshotHtmls: string[] = [];

export async function analyzeUrl(
    page: Page,
    url: string,
    axeSpecs: Spec,
    config: Config,
    alreadyVisited: Map<string, SitecheckerViewport>,
): Promise<ResultByUrl | null> {
    if ((await page.url()) !== url) {
        await page.goto(url, { waitUntil: 'load' });
        await waitForHTML(page, config.timeout, config.debugMode);
    } else {
        debug(config.debugMode, 'URL already open.' + url);
    }
    const analyzedSiteViewport = alreadyVisited.get(url);
    if (
        analyzedSiteViewport &&
        analyzedSiteViewport.width === page.viewport()?.width &&
        analyzedSiteViewport.height === page.viewport()?.height
    ) {
        debug(config.debugMode, 'Already visited: ' + url);
        return null;
    }
    const viewport = page.viewport();
    if(viewport) {
        alreadyVisited.set(url, viewport);
    }
    
    log('Currently analyzing ' + url);

    if (config.saveImages) {
        try {
            await saveScreenshot(page, config.imagesPath, getEscaped(url) + '.png', config.saveImages);
        } catch (e) {
            error(error + '. Image not saved. Analyze not stopped!');
        }
    }

    let axeResults;
    try {
        const axe = await setupAxe(page, axeSpecs, config);
        axeResults = await axe.analyze();
    } catch (e) {
        error(e + '. Error Axe');
    }
    let urlResult;
    if (axeResults) {
        urlResult = await createUrlResult(url, axeResults);
    }
    await makeScreenshotsWithErrorsBorderd(urlResult, page, config, savedScreenshotHtmls);
    await page.reload();
    await waitForHTML(page);
    await markAllTabableItems(page, url, config, urlResult);
    return urlResult;
}
