/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser } from '@agent-infra/browser';
import { ContentExtractionStrategy, ContentExtractionResult } from '../types';

/**
 * MarkdownStrategy - Implements the current browser_get_markdown functionality
 *
 * This strategy uses the existing browser_get_markdown implementation that's
 * currently causing OOM issues with large pages. It extracts page content and
 * converts it to markdown format.
 */
export class MarkdownStrategy implements ContentExtractionStrategy {
  readonly name = 'CurrentMarkdown';
  readonly description =
    'Current browser_get_markdown implementation that extracts page content and converts to markdown.';

  async extractContent(
    browser: LocalBrowser,
    url: string,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'domcontentloaded',
  ): Promise<ContentExtractionResult> {
    const page = await browser.createPage();

    try {
      await page.goto(url, { waitUntil });

      // Get raw page content for comparison
      const originalContent = await page.content();

      // Extract markdown using page.evaluate (similar to current implementation)
      const markdown = await page.evaluate(() => {
        // Simple markdown conversion from HTML
        const html = document.body.innerHTML;
        const div = document.createElement('div');
        div.innerHTML = html;

        // Remove script and style elements
        const scripts = div.querySelectorAll('script, style');
        scripts.forEach((el) => el.remove());

        // Simple text extraction
        return div.textContent || '';
      });

      return {
        content: markdown,
        originalLength: originalContent.length,
      };
    } finally {
      await page.close();
    }
  }
}
