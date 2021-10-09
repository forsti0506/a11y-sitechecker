import { Point } from 'puppeteer';

export function isElementVisible(elementstring: string | null): boolean {
    let elem = elementstring ? document.getElementById(elementstring) : null;
    if (!(elem instanceof Element)) {
        elem = elementstring ? document.querySelector(elementstring) : null;
        if (!elem) return false;
    }
    const style = getComputedStyle(elem);
    if (style.display === 'none') return false;
    if (style.visibility !== 'visible') return false;
    if (style.opacity === '0') return false;
    if (
        elem.offsetWidth +
            elem.offsetHeight +
            elem.getBoundingClientRect().height +
            elem.getBoundingClientRect().width ===
        0
    ) {
        return false;
    }
    const elementPoints: { [key: string]: Point } = {
        center: {
            x: elem.getBoundingClientRect().left + elem.offsetWidth / 2,
            y: elem.getBoundingClientRect().top + elem.offsetHeight / 2,
        },
        'top-left': {
            x: elem.getBoundingClientRect().left,
            y: elem.getBoundingClientRect().top,
        },
        'top-right': {
            x: elem.getBoundingClientRect().right,
            y: elem.getBoundingClientRect().top,
        },
        'bottom-left': {
            x: elem.getBoundingClientRect().left,
            y: elem.getBoundingClientRect().bottom,
        },
        'bottom-right': {
            x: elem.getBoundingClientRect().right,
            y: elem.getBoundingClientRect().bottom,
        },
    };

    for (const index in elementPoints) {
        const point: Point = elementPoints[index];
        if (point.x < 0) return false;
        if (point.x > (document.documentElement.clientWidth || window.innerWidth)) return false;
        if (point.y < 0) return false;
        if (point.y > (document.documentElement.clientHeight || window.innerHeight)) return false;
        let pointContainer = document.elementFromPoint(point.x, point.y);
        if (pointContainer !== null) {
            do {
                if (pointContainer === elem) return !elementIntersected(elem.getBoundingClientRect());
            } while ((pointContainer = pointContainer.parentNode as HTMLElement));
        }
    }
    return false;
}

export function elementIntersected(elementRect: DOMRect): boolean {
    return Array.from(document.body.getElementsByTagName('*'))
        .filter((x) => getComputedStyle(x, null).getPropertyValue('position') === 'fixed')
        .some((fixedElem) => {
            const fixedElementClientRect = fixedElem.getBoundingClientRect();
            const isIntersected = !(
                elementRect.top > fixedElementClientRect.bottom ||
                elementRect.right < fixedElementClientRect.left ||
                elementRect.bottom < fixedElementClientRect.top ||
                elementRect.left > fixedElementClientRect.right
            );
            if (
                isIntersected &&
                fixedElementClientRect.height + elementRect.height >
                    window.adjustScrollingBehindFixed + elementRect.height
            ) {
                window.adjustScrollingBehindFixed = fixedElementClientRect.height + elementRect.height;
            }
            return isIntersected;
        });
}

export function highestZIndex(): number {
    return Math.max(
        ...Array.from(document.querySelectorAll('body *'), (elem) => parseFloat(getComputedStyle(elem).zIndex)).filter(
            (zIndex) => !isNaN(zIndex),
        ),
    );
}
