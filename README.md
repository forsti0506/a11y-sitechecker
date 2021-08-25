# a11y-sitechecker

[![npm version](https://badge.fury.io/js/a11y-sitechecker.svg)](https://badge.fury.io/js/a11y-sitechecker)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/cc8d2ac7f50c487db55ff311a8ac351e)](https://www.codacy.com/gh/forsti0506/a11y-sitechecker/dashboard?utm_source=github.com&utm_medium=referral&utm_content=forsti0506/a11y-sitechecker&utm_campaign=Badge_Grade)
![Commits since last release](https://img.shields.io/github/commits-since/forsti0506/a11y-sitechecker/latest?color=green&style=flat-square)
![Dependency status](https://img.shields.io/david/forsti0506/a11y-sitechecker?style=flat-square)
![Downloads per month](https://img.shields.io/npm/dm/a11y-sitechecker)

A11y-sitecheker is a tool to check a site against accessibility criteria. It
uses <a href="https://github.com/dequelabs/axe-core">axe-core</a> with the option to combine results of multiple sites.
On the one hand there is the option to let the tool crawl your whole site and on the other site you can provide urls
which should be checked by the tool. The results are printed to the console, saved as JSONs or returned. The tool
can be called by javascript or directly by command line. Additionally there are Images created which indicates the
errors, shows the tab-order and other features.

## Features

-   Crawls Websites automatically for accessibility issues
    -   In addition clicking all Clickable Items (Alpha Status)
-   Analyze a Set of URLs agains accessibility criteria
-   Provide Images for
    -   Tab-Order (A C means you have to check if there are click and key interaction is possible!)
    -   Errors highlighted
    -   View of site in general
-   Results for different viewports

## Test Coverage

| Statements                  | Branches                | Functions                 | Lines             |
| --------------------------- | ----------------------- | ------------------------- | ----------------- |
| ![Statements](https://img.shields.io/badge/statements-31.42%25-red.svg) | ![Branches](https://img.shields.io/badge/branches-27.78%25-red.svg) | ![Functions](https://img.shields.io/badge/functions-25.58%25-red.svg) | ![Lines](https://img.shields.io/badge/lines-32.27%25-red.svg) |

### Install

```properties
npm install a11y-sitechecker | yarn add a11y-sitechecker
```

### Usage

#### Commandline

You can use it in your package.json or in your console like the following:

```properties
a11y-sitechecker --config=config.json -T=1000
```

The available options on the commandline are:

```properties
-j | --json: "Output results as JSON. Otherwise output is displayed on the console"
--config <string>: "Provide a config.json"
-T, --threshold <number> "permit this number of errors, warnings, or notices, otherwise fail with exit code 2"
```

#### Typescript

Call the entry function in your code and use the provided interfaces. The result is an array which contains a result for
every specified viewport. Only return defined if there is console output or not.

```typescript
export async function entry(
    config: Config,
    axeSpecs: Spec,
    url: string,
    onlyReturn?: boolean,
): Promise<A11ySitecheckerResult[]>;
```

### Configuration File Options

#### Overview

```typescript
export interface Config {
    json: boolean;
    resultsPath: string;
    resultsPathPerUrl: string;
    axeConfig?: AxeConfig;
    login?: Login;
    saveImages?: boolean;
    imagesPath?: string;
    launchOptions?: LaunchOptions;
    ignoreElementAttributeValues?: string[];
    urlsToAnalyze: string[];
    clickableItemSelector?: string;
    analyzeClicks?: boolean;
    analyzeClicksWithoutNavigation?: boolean;
    threshold: number;
    timeout: number;
    debugMode: boolean;
    viewports: SitecheckerViewport[];
    resultTypes: resultGroups[];
    idTags?: IdTag;
    runOnly: RunOnly | TagValue[] | string[];
    crawl: boolean;
    name: string;
    cookieSelector?: string; // provide a selector for clicking cookie consent button (example: "[id*=cookie] a, [class*=cookie] a, [id*=cookie] button, [class*=cookie] button, [id*=didomi] button")
    cookieText?: string; //provides a text for cookie consent text (example: "^(Alle akzeptieren|Akzeptieren|Verstanden|Zustimmen|Okay|OK|Alle Cookies akzeptieren)$")
}
```

#### Config Option Details

Every configuration which is not inserted in the config file is by default false or undefined if not explicitly
mentioned!

##### Name

The name is the major element to identify your run! You have to provide it

```json
{
    "name": "MyName"
}
```

##### JSON Output

Define if output should be to a json file. You can additionally add a path to store the results.json file!

```json
{
    "json": true,
    "resultsPath": "to a folder, starting with the folder where the script is executed"
}
```

##### Axe-core Language

If you like to choose your own language for the axe-core results, you can define a locale from the standard locales your
you can provide your own locale with a path!

```json
{
    "axeConfig": {
        "locale": "de",
        "localePath": "path to locale"
    }
}
```

##### Login steps

If your site need some login steps you can define it here! The input array defines the elements with css-selectors where
you like to input the value! In the end you have to define the button which is clicked after the form is filled! You can
repeat this steps if needed!

```json
{
    "login": {
        "url": "http://myloginurl.at", 
        "steps": [
            {
                "input": [
                    {
                        "selector": "#user_login",
                        "value": "user"
                    },
                    {
                        "selector": "#user_pass",
                        "value": "passwort"
                    }
                ],
                "submit": "#wp-submit"
            }
        ]
    }
}
```

##### Images

If you like to take Screenshots during the evaluation, define it here! The images are saved in a folder images under the results path!

```json
{
    "saveImages": true,
}
```

##### Launch Options

You can define launch Options for puppeteer. Please see the
documentation <a href="https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions">here</a>

```json
{
    "launchOptions": {}
}
```

##### Ignoring Elements

You can define string which should lead to ignored links and button clicks. Usually if you a are in a logged in context
the crawle should not do a logout!

```json
{
    "ignoreElementAttributeValues": ["logout"]
}
```

##### Links to Analyze

You have to define the links you like to analyze. If you specify 1 link, you can use the crawl function, which crawls then the url. If you provide more then 1 url, you are not allowed to set crawl to true. It is by default false!

```json
{
    "urlsToAnalyze": ["www.test.at"],
    "crawl": true
}
```

##### Analyzing Clicks

It is possible to analyze clickable Items, which are not links (buttons who change the view,...). By default it searches
by this selector : "button, select, details, [tabindex]:not([tabindex="-1"])" You can activate this by:

```json
{
    "analyzeClicks": true,
    "clickableItemSelector": "button, details"
}
```

##### Clicks without Navigation

It is possible to analyze button clicks which does not affect the url. If you like to use this feature activate it here!

```json
{
    "analyzeClicksWithoutNavigation": true
}
```

##### Deactive analyze of clicks

You can activate/deactive the analyze of clicks (alpha status). Standard is false!

```json
{
    "analyzeClicks": true
}
```

##### Threshold and Timeout

You can specify a timeout in ms for operations which can lead to errors (for example a selector is not found). To cause
the console to end with an error if there are more errors than allowed (for example in build pipelines) you can specifiy
a threshold (same like in the command line). Standard: threshold 0, timeout 30000

```json
{
    "threshold": 100,
    "timeout": 1000
}
```

##### DebugMode

Activating the debugMode leads to more logs presented in the console output. By default it is false

```json
{
    "debugMode": true
}
```

##### Specifiying viewport

Viewports are used for different devices. Sometimes there are different elements which can cause new or other
accessibility problems! Standard viewport ist 1920\*1080!

```json
{
    "viewports": [
        {
            "width": 1920,
            "height": 1080
        }
    ]
}
```

##### Result types

Result types are used to reduce effort for
axe-core (<a href="https://www.deque.com/axe/core-documentation/api-documentation/">Documentation</a>)
Standard is violations and incomplete!

```json
{
    "resultTypes": ["violations", "incomplete"]
}
```

##### ID-Tags

ID-Tags are used to mark axe-core rules with own Tags (for example if someone wants to know only these results)

```json
{
    "idTags": {
        "aria-required-attr": ["XYZ"],
        "meta-viewport": ["XYZ"]
    }
}
```
