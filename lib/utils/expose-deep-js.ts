// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exposeDepsJs (deps: Record<string, (...args: any) => any>): string {
    return Object.keys(deps)
      .map((key) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `window["${key}"] = ${deps[key]};`;
      })
      .join("\n");
  };