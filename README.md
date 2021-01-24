# a11y-sitechecker

A11y-sitecheker is a tool to check a whole site against accessibility criteria. It uses <a href="https://github.com/dequelabs/axe-core">axe-core</a> to check whole sites for accessibility issues.
It is crawling the first given Domain and tries to find all links recursivly. In addition it is possible to click elements which have a tabindex >= 0 (links are ignored there).

## Current state
It is under development! Please don't use it in critical environments! 

### Install

```properties
npm install a11y-sitechecker
```

### Use it

You can use it in your package.json or in your console like this
```properties
a11y-sitechecker-dashboard https://www.test.at --config=config.json -T=1000
```

The available options on the commandline are:
```properties
-j | --json: "Output results as JSON. Otherwise output is displayed on the console"
--config <string>: "Provide a config.json"
-T, --threshold <number> "permit this number of errors, warnings, or notices, otherwise fail with exit code 2"
```

### Configuration File

Every configuration which is not inserted in the config file is by default false or undefined if not explicitly mentioned!

Define if output should be to a json file. You can additionally add a path to store the results.json file!
```json
{
  "json": true,
  "resultsPath": "to a folder, starting with the folder where the script is executed"
} 
```


If you like to choose your own language for the axe-core results, you can define a locale from the standard locales your you can provide your own locale with a path!
```json
{
  "axeConfig": {
    "locale": "de",
    "localePath": "path to locale"
  }
} 
```
If your site need some login steps you can define it here! The input array defines the elements with selectors where you like to input the value! In the end you have to define the button which is clicked after the form is filled! You can repeat this steps if needed!

```json
{
  "login": [
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
```

If you like to take Screenshots during the evaluation, define it here! If needed you define a path for the images!

```json
{
  "saveImages": "yes",
  "imagesPath": "folder to save images"
} 
```

You can define launch Options for pupeteer. Please see the documentation <a href="https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#puppeteerlaunchoptions">here</a>
```json
{
  "launchOptions": {}
} 
```

You can define string which should lead to ignored links and button clicks. Usually if you a are in a logged in context the crawle should not do a logout!
```json
{
  "ignoreElementAttributeValues": ["logout"]
} 
```

You can define the links you like to analyze. Therefore only the links mentioned in this array are visited and no other operations are carried out! The url in the command line is used if you need to login before. If there are no login steps it is only used to save the results!

```json
{
  "urlsToAnalyze": ["www.test.at"]
} 
```

It is possible to analyze clickable Items, which are not links (buttons who change the view,...). By default it searches by this selector : "button, select, details, [tabindex]:not([tabindex="-1"])" You can activate this by:
```json
{
  "analyzeClicks": true,
  "clickableItemSelector": "button, details"
} 
```

It is possible to analyze button clicks which does not affect the url. If you like to use this feature activate it here!
```json
{
  "analyzeClicksWithoutNavigation": true
} 
```


