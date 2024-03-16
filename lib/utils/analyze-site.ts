import { Spec } from 'axe-core';
import { Browser, Page } from 'puppeteer';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { Config, SitecheckerViewport } from '../models/config';
import { analyzeUrl } from './analyze-url';
import { clickingElements } from './clicking-elements';
import { getLinks } from './get-links';
import { debug, log } from './helper-functions';

const elementsToClick: Map<string, string[]> = new Map<string, string[]>();

const rootDomain = { value: '' };

const savedScreenshotHtmls: Map<string, string> = new Map();

export async function analyzeSite(
    axeSpecs: Spec,
    firstpage: Page,
    config: Config,
    resultsByUrl: (ResultByUrl | null)[],
    browser: Browser,
    alreadyVisited: Map<string, SitecheckerViewport>,
    alreadyParsed: string[],
    notCheckedLinks: string[],
    link?: string,
): Promise<ResultByUrl[]> {
    if (!config.crawl) {
        const resultsAsPromise = lastValueFrom(
            from(config.urlsToAnalyze).pipe(
                mergeMap(async (url) => {
                    const page = await browser.newPage();
                    const viewport = firstpage.viewport();
                    if (viewport) {
                        await page.setViewport(viewport);
                    }

                    const result = await analyzeUrl(page, url, axeSpecs, config, alreadyVisited, savedScreenshotHtmls);
                    await page.close();
                    return result;
                }, 4),
                toArray<ResultByUrl | null>(),
            ),
        );
        const result = await resultsAsPromise;
        resultsByUrl.push(...result);
    } else {
        let url;
        if (!link) {
            url = config.urlsToAnalyze[0];
        } else {
            url = link;
        }

        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            url = 'https://' + url;
        }
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        log('Start analyze of ' + url);

        resultsByUrl.push(await analyzeUrl(firstpage, url, axeSpecs, config, alreadyVisited, savedScreenshotHtmls));

        const html = await firstpage.content();
        const links = getLinks(
            html,
            url,
            config,
            alreadyParsed,
            rootDomain,
            elementsToClick,
            notCheckedLinks,
            alreadyVisited,
        );

        const results = lastValueFrom(
            from(links.entries()).pipe(
                mergeMap(async ([i, link]) => {
                    debug(config.debugMode, 'Visiting ' + i + ' of ' + (links.length - 1));
                    const page = await browser.newPage();
                    const viewport = firstpage.viewport();
                    if (viewport) {
                        await page.setViewport(viewport);
                    }
                    if (alreadyVisited.get(link)) {
                        return null;
                    }
                    const result = await analyzeUrl(page, link, axeSpecs, config, alreadyVisited, savedScreenshotHtmls);
                    await page.close();
                    return result;
                }, 4),
                toArray<ResultByUrl | null>(),
            ),
        );
        resultsByUrl.push(...(await results));

        if (config.analyzeClicks)
            await clickingElements(
                config,
                url,
                firstpage,
                elementsToClick,
                axeSpecs,
                resultsByUrl,
                browser,
                alreadyVisited,
                alreadyParsed,
                notCheckedLinks,
            );

        for (const [i, link] of links.entries()) {
            log(config.debugMode, 'parsing ' + i + ' of ' + (links.length - 1));
            if (!alreadyParsed.includes(link)) {
                await analyzeSite(
                    axeSpecs,
                    firstpage,
                    config,
                    resultsByUrl,
                    browser,
                    alreadyVisited,
                    alreadyParsed,
                    notCheckedLinks,
                    link,
                );
                log(config.debugMode, 'Finished analyze of Site: ' + link);
            }
        }
    }

    savedScreenshotHtmls.clear();
    return resultsByUrl.filter(notEmpty);
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}
