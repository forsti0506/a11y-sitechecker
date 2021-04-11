import { Spec } from 'axe-core';
import { Browser, Page } from 'puppeteer';
import { Config, SitecheckerViewport } from '../models/config';
import { ResultByUrl } from '../models/a11y-sitechecker-result';
import { log } from './helper-functions';
import { getLinks } from './get-links';
import { analyzeUrl } from './analyze-url';
import { from } from 'rxjs';
import { mergeMap, toArray } from 'rxjs/operators';
import { clickingElements } from './clicking-elements';

const elementsToClick: Map<string, string[]> = new Map<string, string[]>();

const rootDomain = { value: '' };

export async function analyzeSite(
    url: string,
    axeSpecs: Spec,
    firstpage: Page,
    config: Config,
    resultsByUrl: (ResultByUrl | null)[],
    browser: Browser,
    alreadyVisited: Map<string, SitecheckerViewport>,
    alreadyParsed: string[],
    notCheckedLinks: string[],
): Promise<ResultByUrl[]> {
    if (config.urlsToAnalyze) {
        const test = from(config.urlsToAnalyze)
            .pipe(
                mergeMap(async (url) => {
                    const page = await browser.newPage();
                    await page.setViewport({
                        width: firstpage.viewport().width,
                        height: firstpage.viewport().height,
                    });
                    const result = await analyzeUrl(page, url, axeSpecs, config, alreadyVisited);
                    await page.close();
                    return result;
                }, 4),
                toArray<ResultByUrl | null>(),
            )
            .toPromise();
        const result = await test;
        resultsByUrl.push(...result);
    } else {
        if (!url.startsWith('https://') && !url.startsWith('http://')) {
            url = 'https://' + url;
        }
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        log('Start analyze of ' + url);

        resultsByUrl.push(await analyzeUrl(firstpage, url, axeSpecs, config, alreadyVisited));

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

        const results = from(links.entries())
            .pipe(
                mergeMap(async ([i, link]) => {
                    log(config.debugMode, 'Visiting ' + i + ' of ' + (links.length - 1));
                    const page = await browser.newPage();
                    await page.setViewport({
                        width: firstpage.viewport().width,
                        height: firstpage.viewport().height,
                    });
                    if (alreadyVisited.get(link)) {
                        return null;
                    }
                    const result = await analyzeUrl(page, link, axeSpecs, config, alreadyVisited);
                    await page.close();
                    return result;
                }, 4),
                toArray<ResultByUrl | null>(),
            )
            .toPromise();
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
                    link,
                    axeSpecs,
                    firstpage,
                    config,
                    resultsByUrl,
                    browser,
                    alreadyVisited,
                    alreadyParsed,
                    notCheckedLinks,
                );
                log(config.debugMode, 'Finished analyze of Site: ' + link);
            }
        }
    }
    return resultsByUrl.filter(notEmpty);
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}