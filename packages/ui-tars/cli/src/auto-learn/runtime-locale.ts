/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RuntimeLocaleConfig {
  compositeDelimiters: string[];
  contentActionTerms: string[];
}

export const RUNTIME_LOCALES = {
  default: {
    compositeDelimiters: [
      'and then',
      'then',
      'after',
      '然后',
      '之后',
      '再',
      '并且',
      '并',
      '同时',
      '后',
    ],
    contentActionTerms: [
      'type',
      'input',
      'send',
      'reply',
      'write',
      'enter text',
      '输入',
      '发送',
      '回复',
      '填写',
    ],
  },
  en: {
    compositeDelimiters: ['and then', 'then', 'after'],
    contentActionTerms: ['type', 'input', 'send', 'reply', 'write', 'enter text'],
  },
  'zh-CN': {
    compositeDelimiters: ['然后', '之后', '再', '并且', '并', '同时', '后'],
    contentActionTerms: ['输入', '发送', '回复', '填写'],
  },
} satisfies Record<string, RuntimeLocaleConfig>;

export type RuntimeLocaleName = keyof typeof RUNTIME_LOCALES;

export const DEFAULT_RUNTIME_LOCALE: RuntimeLocaleConfig = RUNTIME_LOCALES.default;

export function resolveRuntimeLocale(
  locale: RuntimeLocaleName | string | undefined,
): RuntimeLocaleConfig {
  if (!locale) {
    return DEFAULT_RUNTIME_LOCALE;
  }

  return RUNTIME_LOCALES[locale as RuntimeLocaleName] || DEFAULT_RUNTIME_LOCALE;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildLocalePattern(terms: string[]): RegExp {
  return new RegExp(terms.map(escapeRegExp).join('|'), 'i');
}

export function containsLocaleTerm(input: string, terms: string[]): boolean {
  if (!input.trim() || terms.length === 0) {
    return false;
  }

  return buildLocalePattern(terms).test(input);
}

function cleanSegments(segments: string[]): string[] {
  return segments
    .map((segment) =>
      segment.trim().replace(/^[,，。、；;\s]+|[,，。、；;\s]+$/g, ''),
    )
    .filter(Boolean);
}

function stripCompositePrefix(
  value: string,
  locale: RuntimeLocaleConfig,
): string {
  let output = value.trim();
  for (const delimiter of locale.compositeDelimiters) {
    if (output.toLowerCase().startsWith(delimiter.toLowerCase())) {
      output = output.slice(delimiter.length).trim();
      break;
    }
  }
  return output;
}

export function splitCompositeQueryWithLocale(
  query: string,
  locale: RuntimeLocaleConfig = DEFAULT_RUNTIME_LOCALE,
): string[] {
  const punctuationSegments = cleanSegments(query.split(/[\n,，;；]+/))
    .map((segment) => stripCompositePrefix(segment, locale))
    .filter(Boolean);
  const delimiterPattern =
    locale.compositeDelimiters.length > 0
      ? buildLocalePattern(locale.compositeDelimiters)
      : null;

  const refinedSegments = punctuationSegments.flatMap((segment) =>
    delimiterPattern
      ? cleanSegments(segment.split(delimiterPattern))
      : [segment],
  );

  return refinedSegments.length > 0 ? refinedSegments : cleanSegments([query]);
}
