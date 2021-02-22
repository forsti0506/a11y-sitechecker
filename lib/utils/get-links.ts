import * as JSDOM from 'jsdom';
import * as chalk from 'chalk';
import { getUniqueSelector } from './UniqueSelector';
import { isAbsoluteUrl, shoouldElementBeIgnored } from './helper-functions';
import { Config } from '../models/config';

export interface RootDomain {
    value: string;
}
const debug = console.debug;

export function getLinks(
    html: string,
    url: string,
    config: Config,
    alreadyParsed: string[],
    rootDomain: RootDomain,
    elementsToClick: Map<string, string[]>,
    notCheckedLinks: string[],
    alreadyVisited: string[],
): string[] {
    if (alreadyParsed.includes(url)) {
        return [];
    }
    const dom = new JSDOM.JSDOM(html, { contentType: 'text/html' });
    const links: string[] = [];
    if (!rootDomain.value) {
        const rootDomainURL = new URL(url);
        rootDomain.value = (rootDomainURL.hostname + rootDomainURL.pathname).replace('www.', '');
        debug(chalk.green('RootDomain was set to: ' + rootDomain.value));
    }
    dom.window.document.querySelectorAll('a').forEach((element: HTMLAnchorElement) => {
        let link = element.href;
        if (link === '' && element.getAttributeNames().includes('ng-click')) {
            const shouldElementBeIgnored = shoouldElementBeIgnored(element, config.ignoreElementAttributeValues);
            if (!shouldElementBeIgnored) {
                const uniqueSelector = getUniqueSelector(element, dom);
                const elmsToClick = elementsToClick.get(url);
                if (elementsToClick.has(url) && elmsToClick) {
                    elmsToClick.push(uniqueSelector);
                } else {
                    elementsToClick.set(url, [uniqueSelector]);
                }
            } else {
                debug(chalk.yellow('Element ignored, because of given array: ' + element));
            }
        }
        if (isAbsoluteUrl(link) && link.includes(rootDomain.value)) {
            if (link.startsWith('//')) {
                link = url.startsWith('https') ? 'https:' + link : 'http:' + link;
            }
            if (link.endsWith('/')) {
                link = link.substring(0, link.length - 1);
            }
            if (!links.includes(link) && !alreadyVisited.includes(link)) {
                links.push(link);
            }
        } else if (!isAbsoluteUrl(link) && !link.includes('#')) {
            let absoluteUrl = new URL(link, url).href;
            if (absoluteUrl.endsWith('/')) {
                absoluteUrl = absoluteUrl.substring(0, absoluteUrl.length - 1);
            }
            if (
                !links.includes(absoluteUrl) &&
                !alreadyVisited.includes(absoluteUrl) &&
                absoluteUrl.includes(rootDomain.value)
            ) {
                links.push(absoluteUrl);
            }
        } else if (!notCheckedLinks.includes(link)) {
            notCheckedLinks.push(link);
        }
    });
    if (config.analyzeClicks) {
        debug(chalk.yellow('Searching all clickable Items'));
        dom.window.document
            .querySelectorAll(
                config.clickableItemSelector
                    ? config.clickableItemSelector
                    : 'button, select, details, [tabindex]:not([tabindex="-1"])',
            )
            .forEach((element: Element) => {
                if (
                    !element.hasAttribute('disabled') &&
                    !shoouldElementBeIgnored(element, config.ignoreElementAttributeValues)
                ) {
                    const uniqueSelector = getUniqueSelector(element, dom);
                    const elmsToClick = elementsToClick.get(url);
                    if (elementsToClick.has(url) && elmsToClick) {
                        if (!elmsToClick.includes(uniqueSelector)) {
                            elmsToClick.push(uniqueSelector);
                        }
                    } else {
                        elementsToClick.set(url, [uniqueSelector]);
                    }
                } else {
                    debug(chalk.yellow('Element ignored, because of given array or disabled: ' + element));
                }
            });
    }
    alreadyParsed.push(url);
    return links;
}
