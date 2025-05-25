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
 * ReportStructure defines the dynamic structure of a report
 */
export interface ReportStructure {
  title: string;
  sections: string[];
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

  /**
   * Design dynamic report structure based on collected information
   * @param llmClient OpenAI client
   * @param modelName Model name to use
   * @param query Original user query
   * @param content Collected research content
   * @returns Dynamically generated report structure
   */
  static async designReportStructure(
    llmClient: OpenAI,
    modelName: string,
    query: string,
    content: string,
  ): Promise<ReportStructure> {
    try {
      const response = await llmClient.chat.completions.create({
        model: modelName,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '你是一位专业的研究报告架构设计师。基于给定的查询和收集到的信息，' +
              '设计一个合适的报告结构。返回一个JSON对象，包含报告标题和各个章节。' +
              '章节结构应从收集的信息中自然涌现，而不是强制使用固定模板。' +
              '返回的JSON格式为: {"title": "报告标题", "sections": ["章节1", "章节2", ...]}',
          },
          {
            role: 'user',
            content: `用户查询: ${query}\n\n` + `收集的信息概要: ${content.substring(0, 2000)}...`,
          },
        ],
      });

      const structureContent = response.choices[0]?.message?.content || '';

      try {
        const structure = JSON.parse(structureContent);
        return {
          title: structure.title || `研究报告：${query.substring(0, 50)}`,
          sections: Array.isArray(structure.sections)
            ? structure.sections
            : ['概述', '分析', '结论'],
        };
      } catch (e) {
        console.error(`Error parsing report structure: ${e}`);
        return {
          title: `研究报告：${query.substring(0, 50)}`,
          sections: ['概述', '分析', '结论'],
        };
      }
    } catch (error) {
      console.error(`Error generating report structure: ${error}`);
      return {
        title: `研究报告：${query.substring(0, 50)}`,
        sections: ['概述', '分析', '结论'],
      };
    }
  }

  /**
   * Process and format images for inclusion in the report
   * @param images Array of image data objects
   * @param relevanceKeywords Keywords to determine image relevance
   * @param maxImages Maximum number of images to include
   * @returns Markdown formatted image content
   */
  static processImagesForReport(images: any[], relevanceKeywords: string[], maxImages = 5): string {
    if (!images || images.length === 0) {
      return '';
    }

    // Score images by relevance to keywords
    const scoredImages = images.map((img) => {
      let score = 0;
      const text = ((img.caption || '') + ' ' + (img.alt || '')).toLowerCase();

      relevanceKeywords.forEach((keyword) => {
        if (text.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      return { ...img, score };
    });

    // Sort by score and limit to maxImages
    const topImages = scoredImages
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxImages);

    // Format as markdown
    return topImages
      .map((img) => {
        const caption = img.caption || img.alt || '图片';
        return `![${img.alt || caption}](${img.src})\n*${caption}*\n\n`;
      })
      .join('');
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
