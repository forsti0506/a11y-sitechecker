import JSDOM from 'jsdom';

// dom is optional to use it in puppeteer too
export function getUniqueSelector(elSrc: Node, dom?: JSDOM.JSDOM): string {
    let sSel;
    const aAttr = ['name', 'value', 'placeholder'],
        aSel: string[] = [];
    while (elSrc.parentNode) {
        if (getSelector(aSel, elSrc as Element, sSel, aAttr, dom)) return aSel.join(' > ');
        elSrc = elSrc.parentNode;
    }
    return '';
}

export function uniqueQuery(aSel: string[], dom?: JSDOM.JSDOM): boolean {
    try {
        console.debug(aSel.join('>'));
        return dom
            ? dom.window.document.querySelectorAll(aSel.join('>')).length === 1
            : document.querySelectorAll(aSel.join('>')).length === 1;
    } catch (e) {
        console.error(e);
        const queryStringValidCss: string[] = [];
        aSel.forEach((a) => {
            queryStringValidCss.push(
                a.substring(0, a.indexOf('.')) + "[class='" + a.substring(a.indexOf('.') + 1, a.length) + "']",
            );
        });
        return dom
            ? dom.window.document.querySelectorAll(queryStringValidCss.join('>')).length === 1
            : document.querySelectorAll(queryStringValidCss.join('>')).length === 1;
    }
}

export function getSelector(
    aSel: string[],
    el: Element,
    sSel: string | undefined,
    aAttr: string[],
    dom?: JSDOM.JSDOM,
): boolean {
    // 1. Check ID first
    // NOTE: ID must be unique amongst all IDs in an HTML5 document.
    // https://www.w3.org/TR/html5/dom.html#the-id-attribute
    if (el?.id) {
        if (el.id.match(/^\d/)) {
            aSel.unshift("[id='" + el.id + "']");
        } else {
            aSel.unshift('#' + el.id);
        }
        return true;
    }
    aSel.unshift((sSel = el.nodeName.toLowerCase()));
    // 2. Try to select by classes
    const classContent = el.getAttribute('class');
    if (classContent && !classContent.includes('\r') && !classContent.includes('\n')) {
        if (classContent?.includes('-')) {
            aSel[0] = sSel += '[class*= "' + classContent?.trim().replace(/ +/g, ' ') + '"]';
        } else {
            aSel[0] = sSel += '.' + classContent?.trim().replace(/ +/g, '.');
        }
        if (uniqueQuery(aSel, dom)) return true;
    }
    // 3. Try to select by classes + attributes
    for (let i = 0; i < aAttr.length; ++i) {
        if (aAttr[i] === 'data-*') {
            // Build array of data attributes
            const aDataAttr: Attr[] = [].filter.call(el.attributes, function (attr: Attr) {
                return attr.name.indexOf('data-') === 0;
            });
            for (let j = 0; j < aDataAttr.length; ++j) {
                aSel[0] = sSel += '[' + aDataAttr[j].name + '="' + aDataAttr[j].value + '"]';
                if (uniqueQuery(aSel, dom)) return true;
            }
        } else if (el && el.getAttribute(aAttr[i])) {
            aSel[0] = sSel += '[' + aAttr[i] + '="' + el.getAttribute(aAttr[i]) + '"]';
            if (uniqueQuery(aSel, dom)) return true;
        }
    }
    // 4. Try to select by nth-of-type() as a fallback for generic elements
    let elChild: Element | undefined | null = el;
    let n = 1;
    while ((elChild = elChild?.previousElementSibling)) {
        if (elChild.nodeName === el?.nodeName) ++n;
    }
    aSel[0] = sSel += ':nth-of-type(' + n + ')';
    if (uniqueQuery(aSel, dom)) return true;
    // 5. Try to select by nth-child() as a last resort
    elChild = el;
    n = 1;
    while ((elChild = elChild?.previousElementSibling)) ++n;
    aSel[0] = sSel = sSel.replace(/:nth-of-type\(\d+\)/, n > 1 ? ':nth-child(' + n + ')' : ':first-child');
    return uniqueQuery(aSel, dom);
}
