import { Spec } from 'axe-core';
import * as fs from 'fs';
import { error, getEscaped } from './helper-functions';
import { Config } from '../models/config';
import { OptionValues } from 'commander';
import { Page } from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';

export function setupConfig(options: OptionValues): Config {
    const config: Config = {
        json: true,
        resultsPath: 'results',
        resultsPathPerUrl: '',
        axeConfig: {},
        threshold: 0,
        imagesPath: 'images',
        timeout: 30000,
        debugMode: false,
        viewports: [
            {
                width: 1920,
                height: 1080,
            },
        ],
        resultTypes: ['violations', 'incomplete'],
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
                config.resultsPath = configFile.resultsPath + (configFile.resultsPath.endsWith('/') ? '' : '/');
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
            if (configFile.saveImages) {
                config.saveImages = configFile.saveImages;
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
            if (configFile.debugMode && typeof configFile.debugMode === 'boolean') {
                config.debugMode = configFile.debugMode;
            }
            if (configFile.analyzeClicks && typeof configFile.analyzeClicks === 'boolean') {
                config.analyzeClicks = configFile.analyzeClicks;
            }
            if (configFile.timeout && typeof configFile.timeout === 'number') {
                config.timeout = configFile.timeout;
            }
            if (configFile.viewports) {
                config.viewports = configFile.viewports;
            }
            if (configFile.resultTypes) {
                config.resultTypes = configFile.resultTypes;
            }
            if (configFile.db) {
                config.db = configFile.db;
            }
            if (configFile.idTags) {
                config.idTags = configFile.idTags;
            }
        } catch (e) {
            error(e);
            throw e;
        }
    }

    return config;
}

export function prepareWorkspace(config: Config, url: string): void {
    const urlEscaped = getEscaped(url);
    config.resultsPathPerUrl = config.resultsPath + urlEscaped + '/';
    config.imagesPath = config.resultsPathPerUrl + 'images/';
    if (config.imagesPath && !fs.existsSync(config.imagesPath) && config.saveImages) {
        fs.mkdirSync(config.imagesPath, { recursive: true });
    } else if (config.imagesPath && config.saveImages) {
        fs.rmdirSync(config.imagesPath, { recursive: true });
        fs.mkdirSync(config.imagesPath, { recursive: true });
    }
    if (config.resultsPathPerUrl && !fs.existsSync(config.resultsPath)) {
        fs.mkdirSync(config.resultsPathPerUrl, { recursive: true });
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

export async function setupAxe(page: Page, axeSpecs: Spec, config: Config): Promise<AxePuppeteer> {
    const axe = new AxePuppeteer(page);
    axe.configure(axeSpecs);
    axe.options({
        runOnly: ['wcag2aa', 'wcag2a', 'wcag21a', 'wcag21aa', 'best-practice', 'ACT', 'experimental'],
        resultTypes: config.resultTypes,
    });
    return axe;
}
