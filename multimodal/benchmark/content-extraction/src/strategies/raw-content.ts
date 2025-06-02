/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { LocalBrowser } from '@agent-infra/browser';
import { ContentExtractionStrategy, ContentExtractionResult } from '../types';

/**
 * RawContentStrategy - Extracts raw page content without processing
 *
 * This strategy serves as a baseline for comparison, returning the full
 * unprocessed content of the page using page.content().
 */
export class RawContentStrategy implements ContentExtractionStrategy {
  readonly name = 'RawContent';
  readonly description =
    'Extracts raw page content without any processing, serving as baseline for comparison.';

  async extractContent(
    browser: LocalBrowser,
    url: string,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' = 'domcontentloaded',
  ): Promise<ContentExtractionResult> {
    const page = await browser.createPage();

    try {
      await page.goto(url, { waitUntil });

      // Get raw page content
      const content = await page.content();

      return {
        content,
        originalLength: content.length,
      };
    } finally {
      await page.close();
    }
  }
}
