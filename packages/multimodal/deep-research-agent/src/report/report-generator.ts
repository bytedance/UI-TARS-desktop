/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { Tool } from '@multimodal/agent';
import { OpenAI } from 'openai';
import { ToolResultEvent } from '@multimodal/agent';

/**
 * ReportSection represents a section of the generated report
 */
export interface ReportSection {
  title: string;
  content: string;
}

/**
 * ReportGenerator is responsible for generating modular, well-structured reports
 * with improved information filtering and source citation
 */
export class ReportGenerator {
  /**
   * Filter relevant information from tool results for report generation
   * @param toolResults Array of tool result events
   * @param query Original user query
   * @returns Filtered information that's relevant to the query
   */
  static filterRelevantInformation(toolResults: ToolResultEvent[], query: string): any[] {
    const relevantResults = [];
    const queryTerms = query.toLowerCase().split(/\s+/);

    for (const result of toolResults) {
      let relevanceScore = 0;

      // Skip if content is not available
      if (!result.content) continue;

      const content =
        typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

      const contentLower = content.toLowerCase();

      // Check for query terms in content
      for (const term of queryTerms) {
        if (term.length < 3) continue; // Skip short terms
        if (contentLower.includes(term)) {
          relevanceScore += 1;
        }
      }

      // Add result if it has minimum relevance
      if (relevanceScore > 0) {
        relevantResults.push({
          toolName: result.name,
          content: result.content,
          relevanceScore,
        });
      }
    }

    // Sort by relevance score (highest first)
    return relevantResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Generate a report section using the provided LLM client
   * @param llmClient OpenAI client
   * @param modelName Model name to use
   * @param systemPrompt System prompt for this section
   * @param content Content to process
   * @returns Generated report section
   */
  static async generateSection(
    llmClient: OpenAI,
    modelName: string,
    systemPrompt: string,
    content: string,
  ): Promise<string> {
    try {
      const response = await llmClient.chat.completions.create({
        model: modelName,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        max_tokens: 2000,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error(`Error generating report section: ${error}`);
      return `Failed to generate this section: ${error}`;
    }
  }
}

/**
 * ModularReportTool generates a comprehensive, modular report from research results
 */
export const ModularReportTool = new Tool({
  id: 'generate-modular-report',
  description: 'Generate a comprehensive modular report with citations from research findings',
  parameters: z.object({
    title: z.string().describe('Report title'),
    includeSections: z
      .array(
        z.enum([
          'executive_summary',
          'detailed_analysis',
          'insights',
          'recommendations',
          'conclusion',
        ]),
      )
      .optional()
      .describe('Sections to include in the report (default: all sections)'),
  }),
  function: async ({
    title,
    includeSections = [
      'executive_summary',
      'detailed_analysis',
      'insights',
      'recommendations',
      'conclusion',
    ],
  }) => {
    // This will be implemented by the agent
    return {
      message: 'Report generation will be handled by the agent directly',
    };
  },
});
