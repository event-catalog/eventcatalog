const path = require('path');

const ignorePatterns = [
  '/node_modules/',
  '__fixtures__',
  '/packages/eventcatalog-plugin-generator-asyncapi/lib',
  '/packages/eventcatalog/lib/__tests__/assets',
  '/packages/eventcatalog-plugin-generator-amazon-eventbridge/src/__tests__/assets',
  '/packages/eventcatalog/scripts/__tests__/assets',
];

module.exports = {
  rootDir: path.resolve(__dirname),
  verbose: true,
  testURL: 'http://localhost/',
  testEnvironment: 'node',
  testPathIgnorePatterns: ignorePatterns,
  coveragePathIgnorePatterns: ignorePatterns,
  setupFilesAfterEnv: ['<rootDir>/jest/custom_matchers.ts'],
  moduleNameMapper: {
    '@/lib/(.*)': '<rootDir>/packages/eventcatalog/lib/$1',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/packages/eventcatalog-utils/src/__tests__/assets',
    '<rootDir>/packages/*.*/src/__tests__/tmp',
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
};
