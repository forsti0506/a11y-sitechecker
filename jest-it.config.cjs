module.exports = {
    "roots": [
        "<rootDir>/lib",
        "<rootDir>/bin",
        "<rootDir>/tests",
    ],
    "testMatch": [
        "**/?(*.)+(spec|test).+(ts|tsx|js)"
    ],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                useESM: true,
            },
        ],
    },
    "coveragePathIgnorePatterns": [
        "<rootDir>/tests",
        "<rootDir>/node_modules"
    ],
    "collectCoverageFrom": [
        "lib/**/*.ts",
        "bin/**/*.ts",
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
    setupFilesAfterEnv: ['./lib/jest.setup.js'],
    "coverageReporters": ["json-summary", "json", "text"],
    "preset": "jest-puppeteer"
}
