export interface Config {
    json: boolean;
    resultsPath: string;
    axeConfig?: {
        locale?: string;
        localePath?: string;
    };
}
