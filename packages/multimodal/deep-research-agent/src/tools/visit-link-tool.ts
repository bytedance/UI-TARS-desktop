/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { Tool } from '@multimodal/agent';
import { ConsoleLogger } from '@agent-infra/logger';
import { LocalBrowser } from '@agent-infra/browser';
import { READABILITY_SCRIPT, toMarkdown } from '@agent-infra/shared';
import { ContentProcessor, ContentExtractionMode } from '../utils/content-processor';

/**
 * Enhanced visit link tool with improved features:
 * - Multiple content extraction modes
 * - Structured data extraction
 * - Image extraction
 * - Improved content processing
 */
export const EnhancedVisitLinkTool = new Tool({
  id: 'visit-link',
  description:
    'Visit a specific webpage and extract content with various options for data analysis',
  parameters: z.object({
    url: z.string().describe('The URL to visit and extract content from'),
    extractionMode: z
      .enum(['full', 'summary', 'structured'])
      .optional()
      .describe('Content extraction mode (default: full)'),
    waitForSelector: z
      .string()
      .optional()
      .describe('Optional CSS selector to wait for before extraction'),
    maxContentLength: z
      .number()
      .optional()
      .describe('Maximum content length to extract (default: 8000 characters)'),
    includeImages: z
      .boolean()
      .optional()
      .describe('Whether to extract images from the page (default: true)'),
    maxImages: z.number().optional().describe('Maximum number of images to extract (default: 5)'),
  }),
  function: async ({
    url,
    extractionMode = 'full',
    waitForSelector,
    maxContentLength = 8000,
    includeImages = true,
    maxImages = 5,
  }) => {
    const logger = new ConsoleLogger('[VisitLink]');
    logger.info(`Visiting URL: "${url}" with extraction mode: ${extractionMode}`);

    const browser = new LocalBrowser({ logger });

    try {
      await browser.launch({ headless: true });

      const mode = extractionMode as ContentExtractionMode;

      // Enhanced page evaluation with multiple extraction modes
      const result = await browser.evaluateOnNewPage({
        url,
        waitForOptions: { waitUntil: 'networkidle2', timeout: 30000 },
        pageFunction: (window, readabilityScript, extractionMode, includeImages, maxImages) => {
          const document = window.document;

          // Use Mozilla's Readability library
          const Readability = new Function('module', `${readabilityScript}\nreturn module.exports`)(
            {},
          );

          // Remove irrelevant elements
          document
            .querySelectorAll(
              'script,noscript,style,link,iframe,canvas,svg[width="0"],footer,nav,aside',
            )
            .forEach((el) => el.remove());

          // Parse content with Readability
          const article = new Readability(document).parse();

          // Extract images if requested
          let images: any[] = [];
          if (includeImages) {
            const imgElements = document.querySelectorAll('img');
            images = Array.from(imgElements)
              .filter((img) => {
                // Filter out tiny images, icons, and tracking pixels
                const width = parseInt(img.getAttribute('width') || '0', 10) || img.width || 0;
                const height = parseInt(img.getAttribute('height') || '0', 10) || img.height || 0;

                // Ignore small images
                if (width < 100 || height < 100) return false;

                // Ensure image has a valid src
                const src = img.src || img.getAttribute('data-src') || '';
                return src && src.startsWith('http');
              })
              .slice(0, maxImages as number)
              .map((img) => {
                // Get caption from alt text, figcaption, or nearby text
                let caption = img.alt || '';
                const figure = img.closest('figure');
                const figcaption = figure?.querySelector('figcaption');
                if (figcaption && figcaption.textContent) {
                  caption = figcaption.textContent.trim();
                }

                return {
                  src: img.src || img.getAttribute('data-src') || '',
                  alt: img.alt || '',
                  caption: caption,
                  width: img.width,
                  height: img.height,
                };
              });
          }

          // Get structured data if needed
          let structuredData = null;
          if (extractionMode === 'structured') {
            structuredData = {
              headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
                .map((el) => el.textContent?.trim())
                .filter(Boolean),
              lists: Array.from(document.querySelectorAll('ul, ol'))
                .map((listEl) =>
                  Array.from(listEl.querySelectorAll('li'))
                    .map((li) => li.textContent?.trim())
                    .filter(Boolean),
                )
                .filter((list) => list.length > 0),
              tables: Array.from(document.querySelectorAll('table'))
                .map((tableEl) => {
                  const rows = Array.from(tableEl.querySelectorAll('tr'));
                  return rows.map((row) =>
                    Array.from(row.querySelectorAll('td, th')).map(
                      (cell) => cell.textContent?.trim() || '',
                    ),
                  );
                })
                .filter((table) => table.length > 0),
            };
          }

          // Get metadata
          const metaDescription =
            document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
          const metaKeywords =
            document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';

          return {
            title: article?.title || document.title,
            content: article?.content || document.body.innerHTML,
            url: window.location.href,
            excerpt: article?.excerpt || metaDescription,
            metadata: {
              description: metaDescription,
              keywords: metaKeywords,
            },
            structuredData,
            images,
          };
        },
        pageFunctionParams: [READABILITY_SCRIPT, mode, includeImages, maxImages],
        beforePageLoad: async (page) => {
          await page.setViewport({ width: 1280, height: 900 });
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          );
        },
        afterPageLoad: async (page) => {
          if (waitForSelector) {
            try {
              await page.waitForSelector(waitForSelector, { timeout: 5000 });
            } catch (e) {
              logger.warn(`Selector "${waitForSelector}" not found, continuing anyway`);
            }
          }

          // Scroll down to load lazy content
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
            return new Promise((resolve) => setTimeout(resolve, 500));
          });

          // Wait for dynamic content
          await new Promise((resolve) => setTimeout(resolve, 1500));
        },
      });

      if (!result) {
        return {
          error: 'Failed to extract content from page',
          url,
        };
      }

      // Convert HTML to Markdown
      const markdownContent = toMarkdown(result.content);

      // Process content based on extraction mode
      let processedContent;
      if (mode === ContentExtractionMode.STRUCTURED) {
        processedContent = result.structuredData;
      } else if (mode === ContentExtractionMode.SUMMARY) {
        processedContent = ContentProcessor.summarize(markdownContent, maxContentLength);
      } else {
        // FULL mode - extract key information
        processedContent = ContentProcessor.extractKeyInformation(result.content, maxContentLength);
      }

      return {
        title: result.title,
        url: result.url,
        excerpt: result.excerpt,
        metadata: result.metadata,
        extractionMode: mode,
        content: processedContent,
        images: result.images || [],
      };
    } catch (error) {
      logger.error(`Error visiting URL: ${error}`);
      return {
        error: `Failed to visit URL: ${error}`,
        url,
      };
    } finally {
      await browser.close();
    }
  },
});
