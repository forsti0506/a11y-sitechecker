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
      "branches": 10,
      "functions": 10,
      "lines": 10,
      "statements": -750
    },
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  "coverageReporters": ["json-summary", "json", "text"]
}