/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import Turndown, { TagName } from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

export interface ToMarkdownOptions extends Turndown.Options {
  gfmExtension?: boolean;
  removeTags?: TagName[];
}

/**
 * Convert HTML content to Markdown format
 * @param html HTML string
 * @param options Conversion options
 * @returns Markdown string
 */
export function toMarkdown(
  html: string,
  options: ToMarkdownOptions = {},
): string {
  if (!html) return '';

  try {
    const {
      codeBlockStyle = 'fenced',
      headingStyle = 'atx',
      emDelimiter = '*',
      strongDelimiter = '**',
      gfmExtension = true,
      removeTags = ['script', 'style', 'link'],
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
  } catch (error) {
    console.error('HTML to Markdown conversion failed:', error);
    return html;
  }
}
