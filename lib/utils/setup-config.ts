import { Spec } from 'axe-core';
import * as fs from 'fs';
import { error } from './helper-functions';
import { Config } from '../models/config';
import { OptionValues } from 'commander';

export function setupConfig(options: OptionValues): Config {
    const config: Config = {
        json: true,
        resultsPath: 'results',
        axeConfig: {},
        threshold: 0,
        imagesPath: 'images',
        timeout: 30,
    };
    config.json = options.json;
    if (!config.threshold) {
        config.threshold = parseInt(options.threshold);
    }
    if (options.config) {
        try {
            const configFile = JSON.parse(fs.readFileSync(options.config).toString('utf-8'));
            if (typeof configFile.json === 'boolean') {
                config.json = configFile.json;
            }
            if (configFile.resultsPath && typeof configFile.resultsPath === 'string') {
                config.resultsPath = configFile.resultsPath;
            }
            if (configFile.axeConfig?.locale && typeof configFile.axeConfig.locale === 'string' && config.axeConfig) {
                config.axeConfig.locale = configFile.axeConfig.locale;
            }
            if (
                configFile.axeConfig?.localePath &&
                typeof configFile.axeConfig.localePath === 'string' &&
                config.axeConfig
            ) {
                config.axeConfig.localePath = configFile.axeConfig.localePath;
            }
            if (configFile.login) {
                config.login = configFile.login;
            }
            if (configFile.launchOptions) {
                config.launchOptions = configFile.launchOptions;
            }
            if (configFile.imagesPath) {
                config.imagesPath = configFile.imagesPath;
            }
            if (configFile.ignoreElementAttributeValues) {
                config.ignoreElementAttributeValues = configFile.ignoreElementAttributeValues;
            }
            if (configFile.urlsToAnalyze) {
                config.urlsToAnalyze = configFile.urlsToAnalyze;
            }
            if (configFile.analyzeClicksWithoutNavigation) {
                config.analyzeClicksWithoutNavigation = configFile.analyzeClicksWithoutNavigation;
            }
            if (configFile.debugMode) {
                config.debugMode = configFile.debugMode;
            }
            if (configFile.analyzeClicks) {
                config.analyzeClicks = configFile.analyzeClicks;
            }
            if (configFile.timeout) {
                config.timeout = configFile.timeout;
            }
        } catch (e) {
            error(e);
            throw e;
        }
    }

    return config;
}

export function prepareWorkspace(config: Config): void {
    if (config.imagesPath && !fs.existsSync(config.imagesPath) && config.saveImages) {
        fs.mkdirSync(config.imagesPath);
    } else if (config.imagesPath && config.saveImages) {
        fs.rmdirSync(config.imagesPath, { recursive: true });
        fs.mkdirSync(config.imagesPath);
    }
}

export function setupAxeConfig(config: Config): Spec {
    const axeConfig: Spec = {};
    if (config.axeConfig?.locale) {
        axeConfig.locale = JSON.parse(
            fs.readFileSync('./node_modules/axe-core/locales/' + config.axeConfig.locale + '.json').toString('utf-8'),
        );
    } else if (config.axeConfig?.localePath) {
        axeConfig.locale = JSON.parse(fs.readFileSync(config.axeConfig.localePath).toString('utf-8'));
    }
    return axeConfig;
}
