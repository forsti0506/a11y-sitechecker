module.exports = {
    roots: ['<rootDir>/lib', '<rootDir>/bin'],
    testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
    coveragePathIgnorePatterns: ['<rootDir>/tests', '<rootDir>/node_modules'],
    collectCoverageFrom: ['lib/**/*.ts', 'bin/**/*.ts', '!lib/utils/test-helper-functions.ts'],
    errorOnDeprecated: true,
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 35,
            functions: 40,
            lines: 40,
            statements: 40,
        },
    },
    setupFilesAfterEnv: ['./jest.setup.js'],
    coverageReporters: ['json-summary', 'json', 'text'],
    preset: 'jest-puppeteer',
};
