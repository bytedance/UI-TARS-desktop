/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
export default {
  arrowParens: 'always',
  bracketSameLine: false,
  bracketSpacing: true,
  semi: true,
  experimentalTernaries: false,
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  singleAttributePerLine: false,
  htmlWhitespaceSensitivity: 'css',
  vueIndentScriptAndStyle: false,
  proseWrap: 'preserve',
  insertPragma: false,
  requirePragma: false,
  tabWidth: 2,
  useTabs: false,
  embeddedLanguageFormatting: 'auto',
  endOfLine: 'auto',
  importOrder: [
    '^node:(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^@ui-tars/(.*)$',
    '^@main/(.*)$',
    '^@shared/(.*)$',
    '^@renderer/(.*)$',
    '^@resources/(.*)$',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  // https://github.com/trivago/prettier-plugin-sort-imports/issues/229
  // plugins: ['@trivago/prettier-plugin-sort-imports'],
};
