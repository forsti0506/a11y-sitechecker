import { Spec } from 'axe-core';
import * as fs from 'fs';
import { error, setDebugMode } from './helper-functions';
import { Config } from '../models/config';

export function setupConfig(commander): Config {
    const config: Config = { json: true, resultsPath: 'results', axeConfig: {}, threshold: undefined };
    config.json = commander.json;
    if (!config.threshold) {
        config.threshold = parseInt(commander.threshold);
    }
    if (commander.config) {
        try {
            const configFile = JSON.parse(fs.readFileSync(commander.config).toString('utf-8'));
            if (typeof configFile.json === 'boolean') {
                config.json = configFile.json;
            }
            if (configFile.resultsPath && typeof configFile.resultsPath === 'string') {
                config.resultsPath = configFile.resultsPath;
            }
            if (configFile.axeConfig?.locale && typeof configFile.axeConfig.locale === 'string') {
                config.axeConfig.locale = configFile.axeConfig.locale;
            }
            if (configFile.axeConfig?.localePath && typeof configFile.axeConfig.localePath === 'string') {
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
                setDebugMode(configFile.debugMode);
            }
        } catch (e) {
            error(e);
            throw e;
        }
    }

    return config;
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
