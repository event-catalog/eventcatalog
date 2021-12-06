const path = require('path')

const ignorePatterns = [
  '/node_modules/',
  '__fixtures__',
  '/packages/eventcatalog-plugin-generator-asyncapi/lib'
]

module.exports = {
  rootDir: path.resolve(__dirname),
  verbose: true,
  testURL: 'http://localhost/',
  testEnvironment: 'node',
  testPathIgnorePatterns: ignorePatterns,
  coveragePathIgnorePatterns: ignorePatterns,
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
  }
}
