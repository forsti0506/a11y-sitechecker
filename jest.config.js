module.exports = {
  "roots": [
    "<rootDir>/lib",
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "coveragePathIgnorePatterns": [
    "<rootDir>/tests",
    "<rootDir>/node_modules"
  ],
  "collectCoverageFrom" : [
    "lib/**/*.ts",
    "!lib/utils/test-helper-functions.ts"
  ],
  "errorOnDeprecated": true,
  "collectCoverage": true,
  "coverageThreshold": {
    "global": {
      "branches": 20,
      "functions": 20,
      "lines": 20,
      "statements": -700
    },
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  "coverageReporters": ["json-summary", "json", "text"],
  "preset": "jest-puppeteer"
}