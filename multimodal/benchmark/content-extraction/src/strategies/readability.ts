/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { READABILITY_SCRIPT, toMarkdown } from '@agent-infra/shared';
import { LocalBrowser } from '@agent-infra/browser';
import { ContentExtractionStrategy, ContentExtractionResult } from '../types';

/**
 * ReadabilityStrategy - Uses Mozilla's Readability library for content extraction
 *
 * This strategy implements the Readability-based extraction approach provided in the example.
 * It uses Mozilla's Readability library to extract the main content of a page, removing
 * navigation, ads, and other non-essential elements.
 */
export class ReadabilityStrategy implements ContentExtractionStrategy {
  readonly name = 'Readability';
  readonly description =
    "Uses Mozilla's Readability library to extract main content while removing navigation, ads, and non-essential elements.";

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

      // Extract content using Readability on a document clone to prevent DOM flickering
      const result = await page.evaluate((readabilityScript) => {
        const Readability = new Function('module', `${readabilityScript}\nreturn module.exports`)(
          {},
        );

        // Create a deep clone of the document to avoid modifying the visible DOM
        const documentClone = document.cloneNode(true) as Document;

        // Clean up the cloned document
        documentClone
          .querySelectorAll('script,noscript,style,link,svg,img,video,iframe,canvas,.reflist')
          .forEach((el) => el.remove());

        // Parse content from the clone
        const article = new Readability(documentClone).parse();
        const content = article?.content || '';
        const title = document.title;
        return { content, title: article?.title || title };
      }, READABILITY_SCRIPT);

      // Convert HTML content to markdown
      const markdown = toMarkdown(result?.content || '');

      return {
        content: markdown,
        originalLength: originalContent.length,
        metadata: { title: result?.title },
      };
    } finally {
      await page.close();
    }
  }
}
