export function isFile(path: string): boolean {
    return path.split('/').length > 3 && path.split('/').pop().indexOf('.') > -1;
}
export function isAbsoluteUrl(url): boolean {
    return /^(?:[a-z]+:)?\/\//i.test(url);
}
