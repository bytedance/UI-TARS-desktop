/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { toMarkdown } from '@agent-infra/shared';

/**
 * ContentExtractionMode defines how content should be extracted from web pages
 */
export enum ContentExtractionMode {
  /** Extract full content */
  FULL = 'full',
  /** Extract only a summary of the content */
  SUMMARY = 'summary',
  /** Extract structured data like tables, lists, headings */
  STRUCTURED = 'structured',
}

/**
 * ProcessedContent represents extracted and processed content from a web page
 */
export interface ProcessedContent {
  title: string;
  url: string;
  excerpt: string;
  content: string;
  structuredData?: {
    headings: string[];
    lists: string[][];
    tables: string[][][];
  };
  error?: string;
}

/**
 * ContentProcessor handles extraction and processing of web content
 */
export class ContentProcessor {
  /**
   * Extract key information from HTML content
   * @param html Raw HTML content
   * @param maxLength Maximum length for the extracted content
   * @returns Extracted key information as string
   */
  static extractKeyInformation(html: string, maxLength = 5000): string {
    // Convert to markdown first for easier processing
    const markdown = toMarkdown(html);

    // Extract paragraphs that seem important (contain numbers, facts, etc.)
    const paragraphs = markdown.split('\n\n');

    // Prioritize paragraphs with factual indicators
    const prioritizedParagraphs = paragraphs.filter(
      (p) =>
        p.match(/\d+|percent|percentage|increase|decrease|study|research|according to|analysis/) &&
        p.length > 100,
    );

    // Combine important paragraphs up to maxLength
    let result = '';
    for (const p of prioritizedParagraphs) {
      if ((result + p).length <= maxLength) {
        result += p + '\n\n';
      } else {
        break;
      }
    }

    // If we don't have enough content, add more paragraphs
    if (result.length < maxLength / 2) {
      for (const p of paragraphs) {
        if (!prioritizedParagraphs.includes(p) && p.length > 50) {
          if ((result + p).length <= maxLength) {
            result += p + '\n\n';
          } else {
            break;
          }
        }
      }
    }

    return result.trim();
  }

  /**
   * Extract structured data from HTML content
   * @param document DOM document object
   * @returns Structured data extracted from the document
   */
  static extractStructuredData(document: Document): {
    headings: string[];
    lists: string[][];
    tables: string[][][];
  } {
    // Extract headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[];

    // Extract lists
    const lists = Array.from(document.querySelectorAll('ul, ol'))
      .map(
        (listEl) =>
          Array.from(listEl.querySelectorAll('li'))
            .map((li) => li.textContent?.trim())
            .filter(Boolean) as string[],
      )
      .filter((list) => list.length > 0);

    // Extract tables
    const tables = Array.from(document.querySelectorAll('table'))
      .map((tableEl) => {
        const rows = Array.from(tableEl.querySelectorAll('tr'));
        return rows
          .map((row) =>
            Array.from(row.querySelectorAll('td, th')).map(
              (cell) => cell.textContent?.trim() || '',
            ),
          )
          .filter((row) => row.length > 0);
      })
      .filter((table) => table.length > 0);

    return { headings, lists, tables };
  }

  /**
   * Summarize content to a specified length
   * @param content Original content to summarize
   * @param maxLength Maximum length for the summary
   * @returns Summarized content
   */
  static summarize(content: string, maxLength = 1000): string {
    // Simple summary by taking the first paragraphs up to maxLength
    const paragraphs = content.split('\n\n');
    let summary = '';

    for (const p of paragraphs) {
      if ((summary + p).length <= maxLength) {
        summary += p + '\n\n';
      } else {
        // Add partial paragraph to reach maxLength
        const remainingLength = maxLength - summary.length;
        if (remainingLength > 50) {
          summary += p.substring(0, remainingLength) + '...';
        }
        break;
      }
    }

    return summary.trim();
  }

  /**
   * Process content based on extraction mode
   * @param content Raw content from webpage
   * @param mode Content extraction mode
   * @param document DOM document for structured extraction
   * @returns Processed content based on mode
   */
  static processContent(content: string, mode: ContentExtractionMode, document?: Document): string {
    switch (mode) {
      case ContentExtractionMode.SUMMARY:
        return this.summarize(content);

      case ContentExtractionMode.STRUCTURED:
        if (!document) {
          return 'Error: Document object required for structured extraction';
        }
        const structuredData = this.extractStructuredData(document);
        return JSON.stringify(structuredData, null, 2);

      case ContentExtractionMode.FULL:
      default:
        return this.extractKeyInformation(content);
    }
  }
}
