/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import Turndown, { TagName } from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export const DEFAULT_TAGS_TO_REMOVE: TagName[] = [
  'script',
  'style',
  'link',
  'head',
  'iframe',
  'video',
  'audio',
  'canvas',
  'object',
  'embed',
  'noscript',
  'aside',
  'dialog',
];

/** Plain-text fallback cap to avoid blowing LLM context on conversion failures. */
export const DEFAULT_MARKDOWN_FALLBACK_MAX_LENGTH = 120_000;

export interface ToMarkdownOptions extends Turndown.Options {
  gfmExtension?: boolean;
  removeTags?: TagName[];
  /** Max length when falling back to plain text after conversion errors. */
  fallbackMaxLength?: number;
}

/**
 * Heuristic: output still looks like HTML (failed or partial conversion).
 */
export function looksLikeHtml(text: string): boolean {
  if (!text) {
    return false;
  }

  const sample = text.slice(0, 8000);
  if (/^\s*</.test(sample)) {
    return true;
  }

  const tagCount = (sample.match(/<[a-zA-Z][^>]*>/g) || []).length;
  return tagCount > 5;
}

/**
 * Strip HTML to plain text (Node-safe, no DOM).
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateWithNotice(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return (
    text.slice(0, maxLength) +
    '\n\n[Content truncated: HTML-to-Markdown conversion failed and output exceeded size limits]'
  );
}

function convertHtmlToMarkdown(html: string, options: ToMarkdownOptions): string {
  const {
    codeBlockStyle = 'fenced',
    headingStyle = 'atx',
    emDelimiter = '*',
    strongDelimiter = '**',
    gfmExtension = true,
    removeTags = DEFAULT_TAGS_TO_REMOVE,
  } = options;

  const turndown = new Turndown({
    codeBlockStyle,
    headingStyle,
    emDelimiter,
    strongDelimiter,
  });

  // issue: https://github.com/mixmark-io/turndown/issues/210#issuecomment-353666857
  turndown.remove(removeTags);

  if (gfmExtension) {
    turndown.use(gfm);
  }

  return turndown.turndown(html);
}

function fallbackPlainText(html: string, maxLength: number): string {
  return truncateWithNotice(htmlToPlainText(html), maxLength);
}

/**
 * Convert HTML content to Markdown format
 * @param html HTML string
 * @param options Conversion options
 * @returns Markdown string
 */
export function toMarkdown(html: string, options: ToMarkdownOptions = {}): string {
  if (!html) return '';

  const fallbackMaxLength = options.fallbackMaxLength ?? DEFAULT_MARKDOWN_FALLBACK_MAX_LENGTH;

  try {
    return convertHtmlToMarkdown(html, options);
  } catch (error) {
    console.error('HTML to Markdown conversion failed:', error);

    if (options.gfmExtension !== false) {
      try {
        return convertHtmlToMarkdown(html, { ...options, gfmExtension: false });
      } catch (retryError) {
        console.error('HTML to Markdown conversion failed (without GFM):', retryError);
      }
    }

    return fallbackPlainText(html, fallbackMaxLength);
  }
}
