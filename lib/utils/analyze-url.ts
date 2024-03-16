import { Spec } from 'axe-core';
import { Config, SitecheckerViewport } from '../models/config';
import { debug, error, getEscaped, log, waitForHTML } from './helper-functions';
import { markAllTabableItems } from './mark-all-tabable-items';
import { setupAxe } from './setup-config';
import { Page } from 'puppeteer';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { makeScreenshotsWithErrorsBorderd } from './make-sreenshots-with-errors-borderd';
import { createUrlResult } from './create-url-result';
import { acceptCookieConsent } from './accept-consent-screens';
import { saveScreenshot } from './helper-saving-screenshots';
import { markAllEvents } from './mark-all-events';

export async function analyzeUrl(
    page: Page,
    url: string,
    axeSpecs: Spec,
    config: Config,
    alreadyVisited: Map<string, SitecheckerViewport>,
    savedScreenshotHtmls: Map<string, string>,
): Promise<ResultByUrl | null> {
    try {
        if (page.url() !== url) {
            try {
                await page.goto(url, { waitUntil: 'load' });
            } catch (e: unknown) {
                if (e instanceof Error) {
                    log(e?.message);
                }
            }

            if (config.cookieText && config.cookieSelector) {
                await acceptCookieConsent(page, config);
            }
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
        if (viewport) {
            alreadyVisited.set(url, viewport);
        }

        log('Currently analyzing ' + url);

        if (config.saveImages) {
            await saveScreenshot(page, config.imagesPath, getEscaped(url) + '.png', config.saveImages);
        }

        let axeResults;
        try {
            const axe = await setupAxe(page, axeSpecs, config);
            axeResults = await axe.analyze();
        } catch (e) {
            error(e + '. Error Axe');
        }
        let urlResult: ResultByUrl;
        if (axeResults) {
            urlResult = await createUrlResult(url, axeResults);
            await makeScreenshotsWithErrorsBorderd(urlResult, page, config, savedScreenshotHtmls);
            const events = await markAllEvents(page, config);
            await markAllTabableItems(page, url, config, urlResult, events);

            return urlResult;
        }
        return null;
    } catch (e) {
        throw e;
    }
}
