export function exposeDepsJs(deps: Record<string, (...args: any) => any>): string {
    return Object.keys(deps)
        .map((key) => {
            return `window["${key}"] = ${deps[key]};`;
        })
        .join('\n');
}
