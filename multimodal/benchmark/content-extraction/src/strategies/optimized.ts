/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { READABILITY_SCRIPT, toMarkdown } from '@agent-infra/shared';
import { LocalBrowser, Page } from '@agent-infra/browser';
import { ContentExtractionStrategy, ContentExtractionResult } from '../types';

/**
 * Universal content extraction strategy with advanced algorithms
 * for intelligent content recognition and semantic structure preservation.
 *
 * Key features:
 * - Content density analysis for main content identification
 * - Semantic structure preservation (headings, lists, tables, code blocks)
 * - Context-aware content cleaning and formatting
 * - Fallback mechanisms for reliable extraction across diverse web pages
 * - Memory-efficient processing for large web pages
 */
export class OptimizedStrategy implements ContentExtractionStrategy {
  readonly name = 'Optimized';
  readonly description =
    'Universal content extraction using advanced algorithms to identify and extract the most valuable content while preserving semantic structure and optimizing for token efficiency.';

  /**
   * Main content extraction method
   * @param browser - Browser instance
   * @param url - URL to extract content from
   * @param waitUntil - Page navigation wait condition
   * @returns Promise with extraction result
   */
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

      // Use a combination of strategies to extract content
      const extractedContent = await this.executeExtractionPipeline(page);

      return {
        content: extractedContent,
        originalLength: originalContent.length,
        metadata: { strategy: 'universal' },
      };
    } finally {
      await page.close();
    }
  }

  /**
   * Execute the complete extraction pipeline with multiple fallback strategies
   * @param page - Page instance
   * @returns Extracted content as markdown
   */
  private async executeExtractionPipeline(page: Page): Promise<string> {
    // Extract key page information first
    const pageInfo = await this.extractPageInfo(page);

    // Execute main content extraction logic
    const extractionResult = await page.evaluate(
      ({ readabilityScript, pageInfo }) => {
        // Initialize types for document manipulation
        interface ContentNode {
          text: string;
          type:
            | 'heading'
            | 'paragraph'
            | 'list'
            | 'listItem'
            | 'table'
            | 'code'
            | 'quote'
            | 'other';
          level?: number;
          children?: ContentNode[];
        }

        interface ContentBlock {
          element: Element;
          textDensity: number;
          contentScore: number;
          words: number;
          isNoise: boolean;
        }

        // Initialize Readability (for fallback)
        const Readability = new Function('module', `${readabilityScript}\nreturn module.exports`)(
          {},
        );
        const document = window.document;
        const documentClone = document.cloneNode(true) as Document;

        /**
         * Calculates text density for an element (text length / HTML length)
         */
        const calculateTextDensity = (element: Element): number => {
          const text = element.textContent || '';
          const html = element.innerHTML || '';

          if (!html || html.length === 0) return 0;

          // Text to HTML ratio as density indicator
          return text.length / html.length;
        };

        /**
         * Scores content blocks based on multiple heuristics
         */
        const scoreContentBlock = (element: Element): ContentBlock => {
          // Skip invisible elements
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return {
              element,
              textDensity: 0,
              contentScore: 0,
              words: 0,
              isNoise: true,
            };
          }

          const text = element.textContent || '';
          const textLength = text.length;
          const words = text.split(/\s+/).filter(Boolean).length;

          // Calculate text density
          const textDensity = calculateTextDensity(element);

          // Initialize content score
          let contentScore = 0;

          // Analyze element properties
          const tagName = element.tagName.toLowerCase();

          // Positive signals for content
          if (['p', 'article', 'section', 'div'].includes(tagName)) {
            contentScore += 20;
          }

          if (['pre', 'code'].includes(tagName)) {
            contentScore += 15; // Code blocks are likely valuable content
          }

          if (['ol', 'ul'].includes(tagName)) {
            contentScore += 10; // Lists often contain valuable information
          }

          // Boost score for elements with substantial text
          if (words > 20) contentScore += 10;
          if (words > 50) contentScore += 15;
          if (words > 100) contentScore += 25;

          // Check element classes and IDs for content indicators
          const classAndId = (element.className + ' ' + element.id).toLowerCase();

          // Positive indicators in class/id
          if (/(?:article|content|main|post|text|body)/.test(classAndId)) {
            contentScore += 25;
          }

          // Negative indicators for noise elements
          const isNoise =
            /(?:comment|footer|header|menu|nav|banner|ad|sidebar|widget)/i.test(classAndId) ||
            ['nav', 'header', 'footer', 'aside'].includes(tagName);

          if (isNoise) {
            contentScore -= 50;
          }

          // Return scored content block
          return {
            element,
            textDensity,
            contentScore,
            words,
            isNoise,
          };
        };

        /**
         * Processes an element to extract structured content
         */
        const processElement = (element: Element): ContentNode[] => {
          const nodes: ContentNode[] = [];
          const tagName = element.tagName.toLowerCase();

          // Extract headings
          if (/^h[1-6]$/.test(tagName)) {
            const level = parseInt(tagName.substring(1), 10);
            nodes.push({
              text: element.textContent?.trim() || '',
              type: 'heading',
              level,
            });
            return nodes;
          }

          // Extract paragraphs
          if (tagName === 'p') {
            const text = element.textContent?.trim() || '';
            if (text) {
              nodes.push({ text, type: 'paragraph' });
            }
            return nodes;
          }

          // Extract lists
          if (tagName === 'ul' || tagName === 'ol') {
            const items = Array.from(element.querySelectorAll('li'));
            const listItems = items.map((item) => ({
              text: item.textContent?.trim() || '',
              type: 'listItem' as const,
            }));

            if (listItems.length > 0) {
              nodes.push({
                text: '',
                type: 'list',
                children: listItems,
              });
            }
            return nodes;
          }

          // Extract code blocks
          if (tagName === 'pre' || element.querySelector('code')) {
            const text = element.textContent?.trim() || '';
            if (text) {
              nodes.push({ text, type: 'code' });
            }
            return nodes;
          }

          // Extract tables
          if (tagName === 'table') {
            let tableText = '';
            const rows = Array.from(element.querySelectorAll('tr'));

            rows.forEach((row) => {
              const cells = Array.from(row.querySelectorAll('th, td'));
              tableText += cells.map((cell) => cell.textContent?.trim() || '').join(' | ') + '\n';
            });

            if (tableText.trim()) {
              nodes.push({ text: tableText.trim(), type: 'table' });
            }
            return nodes;
          }

          // Process blockquotes
          if (tagName === 'blockquote') {
            const text = element.textContent?.trim() || '';
            if (text) {
              nodes.push({ text, type: 'quote' });
            }
            return nodes;
          }

          // Process div and other container elements recursively
          if (element.children.length > 0) {
            // Process each child element
            Array.from(element.children).forEach((child) => {
              const childNodes = processElement(child);
              nodes.push(...childNodes);
            });
          } else if (element.textContent?.trim()) {
            // Leaf node with text content
            nodes.push({
              text: element.textContent.trim(),
              type: 'other',
            });
          }

          return nodes;
        };

        /**
         * Find the main content container using content density analysis
         */
        const findMainContentContainer = (): Element | null => {
          // Get all potential content blocks
          const contentBlocks: ContentBlock[] = [];

          // Query for potential content containers
          const potentialContainers = document.querySelectorAll(
            'article, [role="main"], main, .main, #main, .content, #content, .post, .article, section, div',
          );

          // Score each container
          potentialContainers.forEach((element) => {
            // Skip tiny elements and invisible elements
            if ((element.textContent?.length || 0) < 50) return;

            const block = scoreContentBlock(element);
            if (!block.isNoise && block.contentScore > 0) {
              contentBlocks.push(block);
            }
          });

          // Sort by content score
          contentBlocks.sort((a, b) => b.contentScore - a.contentScore);

          // Return the highest scoring element or null if none found
          return contentBlocks.length > 0 ? contentBlocks[0].element : null;
        };

        /**
         * Format content nodes into markdown text
         */
        const formatContentNodes = (nodes: ContentNode[]): string => {
          let markdown = '';

          nodes.forEach((node) => {
            switch (node.type) {
              case 'heading':
                markdown += `${'#'.repeat(node.level || 1)} ${node.text}\n\n`;
                break;

              case 'paragraph':
                markdown += `${node.text}\n\n`;
                break;

              case 'list':
                if (node.children) {
                  node.children.forEach((item) => {
                    markdown += `- ${item.text}\n`;
                  });
                  markdown += '\n';
                }
                break;

              case 'code':
                markdown += `\`\`\`\n${node.text}\n\`\`\`\n\n`;
                break;

              case 'table':
                markdown += `${node.text}\n\n`;
                break;

              case 'quote':
                markdown += `> ${node.text.replace(/\n/g, '\n> ')}\n\n`;
                break;

              case 'other':
                if (node.text.length > 0) {
                  markdown += `${node.text}\n\n`;
                }
                break;
            }
          });

          return markdown;
        };

        /**
         * Main content extraction process
         */
        const extractContent = (): string => {
          // 1. Try to find the main content container
          const mainContainer = findMainContentContainer();

          // 2. If found, process it to extract structured content
          if (mainContainer) {
            const contentNodes = processElement(mainContainer);
            if (contentNodes.length > 0) {
              const extractedText = formatContentNodes(contentNodes);

              // If we have substantial content, return it
              if (extractedText.length > 200) {
                return extractedText;
              }
            }
          }

          // 3. Fallback to top-level heading + paragraph extraction if mainContainer extraction failed
          const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
          const contentFromHeadings: ContentNode[] = [];

          headings.forEach((heading) => {
            const headingNode = processElement(heading)[0];

            if (headingNode) {
              contentFromHeadings.push(headingNode);

              // Get content after this heading until next heading
              let sibling = heading.nextElementSibling;
              while (sibling && !/^h[1-3]$/i.test(sibling.tagName)) {
                const siblingNodes = processElement(sibling);
                contentFromHeadings.push(...siblingNodes);
                sibling = sibling.nextElementSibling;
              }
            }
          });

          if (contentFromHeadings.length > 0) {
            const extractedFromHeadings = formatContentNodes(contentFromHeadings);

            // If we have substantial content, return it
            if (extractedFromHeadings.length > 200) {
              return extractedFromHeadings;
            }
          }

          // 4. Fallback to Readability if all else fails
          try {
            // Create a clean clone to avoid modifying the original document
            const docClone = documentClone;

            // Remove known noise elements
            const noiseSelectors = ['script', 'style', 'noscript', 'iframe', 'svg'];
            noiseSelectors.forEach((selector) => {
              docClone.querySelectorAll(selector).forEach((el) => el.remove());
            });

            // Apply Readability
            const article = new Readability(docClone).parse();

            if (article && article.content) {
              // Use article content
              return article.content;
            }
          } catch (error) {
            // Silently fail and continue with next approach
          }

          // 5. Last resort: extract all paragraphs from document
          const paragraphs = Array.from(document.querySelectorAll('p'));
          let paragraphText = '';

          paragraphs.forEach((p) => {
            const text = p.textContent?.trim() || '';
            if (text.length > 20) {
              // Only include substantial paragraphs
              paragraphText += text + '\n\n';
            }
          });

          return paragraphText || document.body.textContent || '';
        };

        // Execute the content extraction
        let content = extractContent();

        // Add page title if available and not already in content
        if (pageInfo.title && !content.startsWith(`# ${pageInfo.title}`)) {
          content = `# ${pageInfo.title}\n\n${content}`;
        }

        return {
          content,
          title: pageInfo.title,
        };
      },
      { readabilityScript: READABILITY_SCRIPT, pageInfo },
    );

    // Post-process and optimize the extracted content
    return this.postProcessContent(extractionResult.content);
  }

  /**
   * Extract essential page information
   * @param page - Page instance
   * @returns Basic page information
   */
  private async extractPageInfo(page: Page): Promise<{ title: string; url: string }> {
    return await page.evaluate(() => {
      // Extract the page title, using h1 if available, falling back to document.title
      const h1 = document.querySelector('h1');
      const title = (h1 && h1.textContent?.trim()) || document.title.trim();

      return {
        title,
        url: window.location.href,
      };
    });
  }

  /**
   * Post-process and optimize the extracted content
   * @param content - Raw extracted content (HTML or markdown)
   * @returns Cleaned and optimized markdown content
   */
  private postProcessContent(content: string): string {
    // Convert HTML to markdown if needed
    const markdown = content.includes('<') ? toMarkdown(content) : content;

    // Apply a series of optimizations
    return (
      markdown
        // Fix headings format
        .replace(/^(#+)([^\s#])/gm, '$1 $2')

        // Normalize list items
        .replace(/^[•*+-]\s*/gm, '- ')

        // Remove duplicate headings
        .replace(/^(#+ .+)\s+\1$/gm, '$1')

        // Remove excessive blank lines
        .replace(/\n{3,}/g, '\n\n')

        // Remove excessive spaces
        .replace(/[ \t]{2,}/g, ' ')

        // Fix code block formatting
        .replace(/```\s+/g, '```\n')
        .replace(/\s+```/g, '\n```')

        // Fix list item spacing
        .replace(/^([^-\n].+)\n-\s/gm, '$1\n\n- ')

        // Trim and ensure trailing newline
        .trim() + '\n'
    );
  }
}
