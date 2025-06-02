/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, Tool } from '@multimodal/agent';
import { ConsoleLogger } from '@agent-infra/logger';
import { BrowserSearch } from '@agent-infra/browser-search';
import { LocalBrowser } from '@agent-infra/browser';
import { READABILITY_SCRIPT } from '@agent-infra/shared';
import { ContentProcessor } from '../utils/content-processor';

/**
 * DeepDiveTool performs comprehensive research on a specific topic by:
 * - Conducting focused searches on the topic
 * - Extracting key content from multiple sources
 * - Analyzing and synthesizing the information
 * - Providing structured insights
 */
export const DeepDiveTool = new Tool({
  id: 'deep-dive',
  description: 'Conduct deep research on a specific topic by combining search and content analysis',
  parameters: z.object({
    topic: z.string().describe('The specific topic to research deeply'),
    sources: z.array(z.string()).optional().describe('Optional list of specific URLs to analyze'),
    maxSources: z.number().optional().describe('Maximum number of sources to analyze (default: 3)'),
    focusAreas: z
      .array(z.string())
      .optional()
      .describe('Specific aspects of the topic to focus on'),
  }),
  function: async ({ topic, sources = [], maxSources = 3, focusAreas = [] }) => {
    const logger = new ConsoleLogger('[DeepDive]');
    logger.info(`Starting deep dive on topic: "${topic}"`);

    const allSources = [...sources];
    const findings = [];
    const insights = [];

    // If not enough sources provided, do a search to find more
    if (allSources.length < maxSources) {
      const browserSearch = new BrowserSearch({
        logger,
        browserOptions: {
          headless: true,
        },
      });

      try {
        // Search for additional sources
        const searchQuery = focusAreas.length > 0 ? `${topic} ${focusAreas[0]}` : topic;

        logger.info(`Searching for additional sources with query: "${searchQuery}"`);

        const searchResults = await browserSearch.perform({
          query: searchQuery,
          count: maxSources - allSources.length,
          engine: 'google',
          needVisitedUrls: false, // We'll visit them ourselves
        });

        // Add new URLs to our sources list
        allSources.push(...searchResults.map((result) => result.url));

        logger.info(`Found ${searchResults.length} additional sources`);
      } catch (error) {
        logger.error(`Error searching for sources: ${error}`);
      } finally {
        await browserSearch.closeBrowser();
      }
    }

    // Deduplicate sources
    const uniqueSources = [...new Set(allSources)];

    // Create a browser instance for visiting the sources
    const browser = new LocalBrowser({ logger });

    try {
      await browser.launch({ headless: true });

      // Process each source
      for (const url of uniqueSources.slice(0, maxSources)) {
        logger.info(`Analyzing source: ${url}`);

        try {
          const result = await browser.evaluateOnNewPage({
            url,
            waitForOptions: { waitUntil: 'networkidle2', timeout: 30000 },
            pageFunction: (window, readabilityScript, focusAreas) => {
              const document = window.document;

              // Use Readability
              const Readability = new Function(
                'module',
                `${readabilityScript}\nreturn module.exports`,
              )({});

              // Remove irrelevant elements
              document
                .querySelectorAll('script,noscript,style,link,iframe,canvas,footer,nav')
                .forEach((el) => el.remove());

              // Parse content
              const article = new Readability(document).parse();

              // Extract relevant sections based on focus areas
              const relevantSections = [];
              if (focusAreas && focusAreas.length > 0) {
                const allParagraphs = document.querySelectorAll('p');

                for (const area of focusAreas) {
                  const areaLower = area.toLowerCase();
                  // Find paragraphs mentioning this focus area
                  const relevantParagraphs = Array.from(allParagraphs)
                    .filter((p) => p.textContent && p.textContent.toLowerCase().includes(areaLower))
                    .map((p) => p.textContent?.trim())
                    .filter(Boolean);

                  if (relevantParagraphs.length > 0) {
                    relevantSections.push({
                      focusArea: area,
                      content: relevantParagraphs,
                    });
                  }
                }
              }

              return {
                title: article?.title || document.title,
                content: article?.content || '',
                url: window.location.href,
                excerpt: article?.excerpt || '',
                relevantSections,
              };
            },
            pageFunctionParams: [READABILITY_SCRIPT, focusAreas],
          });

          if (result) {
            // Extract key information
            const keyInformation = ContentProcessor.extractKeyInformation(result.content, 3000);

            // Add to findings
            findings.push({
              source: url,
              title: result.title,
              keyInformation,
              relevantSections: result.relevantSections,
            });

            // Extract potential insights
            if (result.relevantSections && result.relevantSections.length > 0) {
              for (const section of result.relevantSections) {
                insights.push({
                  focusArea: section.focusArea,
                  source: url,
                  insight: section.content.join(' ').substring(0, 500),
                });
              }
            }
          }
        } catch (error) {
          logger.error(`Error processing source ${url}: ${error}`);
        }
      }
    } catch (error) {
      logger.error(`Error in deep dive: ${error}`);
      return {
        error: `Failed to perform deep dive: ${error}`,
        topic,
      };
    } finally {
      await browser.close();
    }

    // Generate a summary of the findings
    const summary =
      findings.length > 0
        ? `Analysis of ${findings.length} sources on "${topic}" revealed insights on ${
            new Set(insights.map((i) => i.focusArea)).size
          } focus areas.`
        : `Could not find detailed information on "${topic}".`;

    return {
      topic,
      summary,
      sourcesAnalyzed: findings.length,
      findings,
      insights,
      focusAreas,
    };
  },
});
