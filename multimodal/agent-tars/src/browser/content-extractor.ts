/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { READABILITY_SCRIPT, toMarkdown } from '@agent-infra/shared';
import { ConsoleLogger } from '@multimodal/mcp-agent';
import { Page } from '@agent-infra/browser';

/**
 * Content extraction result with pagination information
 */
export interface PaginatedContentResult {
  /** The extracted content in markdown format */
  content: string;
  /** Total number of pages */
  totalPages: number;
  /** Current page number */
  currentPage: number;
  /** Whether there are more pages available */
  hasMorePages: boolean;
  /** Original page title */
  title?: string;
}

/**
 * PaginatedContentExtractor - Memory-efficient content extraction with pagination support
 *
 * This class leverages the Mozilla Readability algorithm to extract the main content
 * from web pages while supporting pagination to prevent memory issues on large pages.
 *
 * Key features:
 * - Uses Readability to isolate valuable content from web pages
 * - Converts HTML to markdown for better token efficiency
 * - Implements pagination to limit memory usage
 * - Provides detailed pagination metadata
 */
export class PaginatedContentExtractor {
  private readonly logger: ConsoleLogger;
  private readonly pageSize: number;

  /**
   * Create a new paginated content extractor
   *
   * @param logger - Logger instance for debugging and error reporting
   * @param pageSize - Maximum number of characters per page
   */
  constructor(logger: ConsoleLogger, pageSize = 100000) {
    this.logger = logger;
    this.pageSize = pageSize;
  }

  /**
   * Extract content from a web page with pagination support
   *
   * @param page - Puppeteer page object
   * @param pageNumber - Page number to extract (1-based index)
   * @returns Promise with paginated content result
   */
  async extractContent(page: Page, pageNumber = 1): Promise<PaginatedContentResult> {
    try {
      this.logger.debug(`Extracting content page ${pageNumber} with max length ${this.pageSize}`);

      // Extract content using Readability algorithm on a document clone to prevent DOM flickering
      const extractionResult = await page.evaluate((readabilityScript) => {
        // Initialize Readability from script
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

        return {
          content,
          title: article?.title || title,
          fullContent: content,
        };
      }, READABILITY_SCRIPT);

      // Convert HTML content to markdown for better token efficiency
      const fullMarkdown = toMarkdown(extractionResult.fullContent || '');

      // Calculate pagination information
      const totalPages = Math.ceil(fullMarkdown.length / this.pageSize);
      const validPageNumber = Math.min(Math.max(1, pageNumber), totalPages);
      const startIndex = (validPageNumber - 1) * this.pageSize;
      const endIndex = Math.min(startIndex + this.pageSize, fullMarkdown.length);

      // Extract the requested page content
      const pageContent = fullMarkdown.substring(startIndex, endIndex);

      // Add pagination information if there are multiple pages
      let contentWithPagination = pageContent;
      if (totalPages > 1) {
        const paginationInfo = `\n\n---\n\n*Page ${validPageNumber} of ${totalPages}. ${
          validPageNumber < totalPages
            ? `There are ${totalPages - validPageNumber} more pages with additional content.`
            : 'This is the last page.'
        }*\n`;
        contentWithPagination += paginationInfo;
      }

      // Add title to first page if available
      if (validPageNumber === 1 && extractionResult.title) {
        contentWithPagination = `# ${extractionResult.title}\n\n${contentWithPagination}`;
      }

      return {
        content: contentWithPagination,
        totalPages,
        currentPage: validPageNumber,
        hasMorePages: validPageNumber < totalPages,
        title: extractionResult.title,
      };
    } catch (error) {
      this.logger.error(`Error extracting paginated content: ${error}`);
      throw new Error(
        `Content extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
