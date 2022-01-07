/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const OFF = 0;
const WARNING = 1;
const ERROR = 2;

module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: true,
    jest: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    allowImportExportEverywhere: true,
  },
  globals: {
    testStylelintRule: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'airbnb',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  plugins: ['react-hooks'],
  rules: {
    'import/extensions': OFF,
    'no-use-before-define': OFF,
    'react/jsx-filename-extension': OFF,
    'jsx-a11y/anchor-is-valid': OFF,
    'no-console': OFF,
    'global-require': WARNING,
    'react/jsx-props-no-spreading': OFF,
    'import/no-unresolved': [
      ERROR,
      {
        ignore: [
          '^@lib',
          '^@hooks',
          '^@theme',
          '^@docusaurus',
          '^@/hooks',
          '^@eventcatalog',
          '^@/components',
          '@/lib',
          '@/utils',
          '@/types',
          'eventcatalog.config.js',
          '../../eventcatalog.config',
          '../eventcatalog.config',
        ],
      },
    ],
    'react/react-in-jsx-scope': OFF,
    'no-param-reassign': [WARNING, { props: false }],
    'no-undef': OFF,
    '@typescript-eslint/no-namespace': OFF,
    'import/no-extraneous-dependencies': OFF,
    'jsx-a11y/label-has-associated-control': OFF,
    'react/no-array-index-key': OFF,
    '@typescript-eslint/no-explicit-any': OFF, // for now...
    'react/require-default-props': [ERROR, { ignoreFunctionalComponents: true }],
    '@typescript-eslint/ban-ts-comment': OFF,
    'react/function-component-definition': [
      WARNING,
      {
        namedComponents: 'function-declaration',
        unnamedComponents: 'arrow-function',
      },
    ],
  },
};
