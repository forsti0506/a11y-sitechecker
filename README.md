# a11y-sitechecker

A11y-sitecheker is a tool to check a site against accessibility criteria. It uses axe-core to check sites for accessibility issues.
Additionally it is looking the current site and tries to find all links and recursivly testing it with axe-core.

## Current state
It is under development and not ready to use!

### Configuration

You can use the `--config` command line argument to specify a config json file. The config files should look like this:

```json
{
  "json": true,
  "resultsPath": "results",
  "axeConfig": {
    "locale": "de",
    "localePath": ""
  }
}
```
