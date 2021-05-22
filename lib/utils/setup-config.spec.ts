import 'jest';
import fs from 'fs';
import { prepareWorkspace, setupAxe, setupAxeConfig, setupConfig } from './setup-config';
import puppeteer from 'puppeteer';

import { AxePuppeteer } from '@axe-core/puppeteer';
import { getEscaped } from './helper-functions';
import { Config } from '../models/config';
jest.mock('@axe-core/puppeteer');

describe('setup-config', () => {

    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        (AxePuppeteer as jest.Mock).mockClear();
      });

    test('setup-axe with standard runners and result types', async () => {
        const config = setupConfig({});
        const browser = await puppeteer.launch(config.launchOptions);
        const page = (await browser.pages())[0];
        await setupAxe(page, {}, config)
        expect(AxePuppeteer).toHaveBeenCalledTimes(1);
        const mockAxe = (AxePuppeteer as jest.Mock).mock.instances[0];
        expect(mockAxe.configure).toHaveBeenCalledWith({});
        expect(mockAxe.options).toHaveBeenCalledWith({runOnly: ['wcag2aa', 'wcag2a', 'wcag21a', 'wcag21aa', 'best-practice', 'ACT', 'experimental'], resultTypes: ['violations', 'incomplete']});
    });

    test('setup-axe with custon runners and result types', async () => {  
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        const browser = await puppeteer.launch(config.launchOptions);
        const page = (await browser.pages())[0];
        await setupAxe(page, {}, config)
        expect(AxePuppeteer).toHaveBeenCalledTimes(1);
        const mockAxe = (AxePuppeteer as jest.Mock).mock.instances[0];
        expect(mockAxe.configure).toHaveBeenCalledWith({});
        expect(mockAxe.options).toHaveBeenCalledWith({runOnly: ['wcag2aa'], resultTypes: ['violations']});
    });

    test('setup-axe-config without axe locales set', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        const axeConfig = setupAxeConfig(config);
        expect(axeConfig).toStrictEqual({})
    });

    test('setup-axe-config with axe de locale as string', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        config.axeConfig = {};
        config.axeConfig.locale = "de";
        const axeLocale = JSON.parse(
            fs.readFileSync('./node_modules/axe-core/locales/de.json').toString('utf-8'),
        );
        const axeConfig = setupAxeConfig(config);
        expect(axeConfig.locale).toStrictEqual(axeLocale)
    });

    test('setup-axe-config with axe de locale as file', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        config.axeConfig = {};
        config.axeConfig.localePath = "./node_modules/axe-core/locales/de.json";
        const axeLocale = JSON.parse(
            fs.readFileSync('./node_modules/axe-core/locales/de.json').toString('utf-8'),
        );
        const axeConfig = setupAxeConfig(config);
        expect(axeConfig.locale).toStrictEqual(axeLocale)
    });

    test('setup-axe-config with axe unkown locale as file', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        config.axeConfig = {};
        config.axeConfig.localePath = "./node_modules/axe-core/locales/de2.json";
        const axeConfig = setupAxeConfig(config);
        expect(axeConfig).toStrictEqual({})
    });

    test('setup-axe-config with axe unkown locale as string', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        config.axeConfig = {};
        config.axeConfig.locale = "./node_modules/axe-core/locales/de2.json";
        const axeConfig = setupAxeConfig(config);
        expect(axeConfig).toStrictEqual({})
    });

    test('setup-axe-config with axe empty locale as file', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config_empty.json'});
        const axeConfig = setupAxeConfig(config);
        expect(axeConfig.locale).toStrictEqual(undefined)
    });

    test('prepare-workspace with no folder mentioned', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_setup_config.json'});
        const url = 'www.test.at'
        prepareWorkspace(config, url);
        expect(fs.existsSync('results/' + getEscaped(url))).toBe(true);
        fs.rmdirSync('results', {recursive: true});
    });

    test('prepare-workspace with folder mentioned and save images true', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_with_images_and_results.json'});
        const url = 'www.test.at'
        prepareWorkspace(config, url);
        expect(fs.existsSync('tests/results/' + getEscaped(url))).toBe(true);
        expect(fs.existsSync('tests/results/' + getEscaped(url)+ '/images')).toBe(true);
        fs.rmdirSync('tests/results', {recursive: true});
    });

    test('prepare-workspace with folder mentioned and save images true and image folder already here', async() => {
        const config = setupConfig({config: 'tests/setup-config/config_with_images_and_results.json'});
        if(config.imagesPath) {
            const url = 'www.test.at'
            fs.mkdirSync('tests/results/' + getEscaped(url) + '/images', { recursive: true });
            expect(fs.existsSync('tests/results/' + getEscaped(url) + '/images')).toBe(true);
            prepareWorkspace(config, url);
            expect(fs.existsSync('tests/results/' + getEscaped(url))).toBe(true);
            expect(fs.existsSync('tests/results/' + getEscaped(url) + '/images')).toBe(true);
            fs.rmdirSync('tests/results', {recursive: true});
        } else {
            fail();
        }
    });

    test('setupConfig with file not created', async() => {
        expect(() => setupConfig({config: 'tests/setup-config/config_with_images_and_results2.json'})).toThrowError(/no such file or directory, open/);
    });

    test('setupConfig all parts are parsed', async() => {
        const config = setupConfig({config: 'tests/setup-config/config-all.json'});
       
        expect(config).toStrictEqual(expectedConfig);
    });

    test('setupConfig with threshold', async() => {
        const config = setupConfig({config: 'tests/setup-config/config-all.json', threshold: 100});
        const expectedConfigWithThreshold = {...expectedConfig, ...{threshold: 100}};
        expect(config).toStrictEqual(expectedConfigWithThreshold);
    });

    const expectedConfig: Config = {
        json: true,
        resultsPath: "test/results/",
        axeConfig: {
            locale: "de",
            localePath: "path to locale"
        },
        login: [
            {
                input: [
                    {
                        selector: "#user_login",
                        value: "user"
                    },
                    {
                        selector: "#user_pass",
                        value: "passwort"
                    }
                ],
                "submit": "#wp-submit"
            }
        ],              
        saveImages: true,
        imagesPath: 'images',
        launchOptions: {},
        ignoreElementAttributeValues: ["logout"],
        urlsToAnalyze: ["www.test.at"],
        analyzeClicks: true,
        clickableItemSelector: "button, details",
        analyzeClicksWithoutNavigation: true,
        threshold: 0,
        timeout: 1000,
        debugMode: true,
        viewports: [
            {
                width: 1920,
                height: 1080
            }
        ],
        resultTypes: ["violations", "incomplete"],
        resultsPathPerUrl: '',
        runOnly: ['violations'],
        idTags: {
            "aria-required-attr": ["XYZ"],
            "meta-viewport": ["XYZ"]
        }
    
};
});
