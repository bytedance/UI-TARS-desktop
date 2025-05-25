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
  subsections?: ReportSection[];
}

/**
 * ReportStructure defines the dynamic structure of a report
 */
export interface ReportStructure {
  title: string;
  sections: string[];
  subsections?: { [key: string]: string[] };
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

    // 从查询中提取关键词
    const queryTerms = query
      .toLowerCase()
      .split(/[\s,.，。:：;；?？!！()\[\]（）【】]+/)
      .filter((term) => term.length >= 2);

    // 提取中文关键词，更好地匹配中文内容
    const chineseTerms = query.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const allTerms = [...new Set([...queryTerms, ...chineseTerms])];

    // 合并所有关键词
    const searchTerms = [...allTerms];

    for (const result of toolResults) {
      let relevanceScore = 0;
      const toolName = result.name;

      // 跳过没有内容的结果
      if (!result.content) continue;

      let contentText = '';
      let extractedUrl = '';

      // 处理不同类型的内容
      if (typeof result.content === 'string') {
        contentText = result.content;
      } else {
        // 处理对象类型的内容
        const content = result.content as any;

        // 提取URL
        if (content.url) {
          extractedUrl = content.url;
        } else if (content.originalUrl) {
          extractedUrl = content.originalUrl;
        }

        // 提取文本内容
        if (content.content && typeof content.content === 'string') {
          contentText = content.content;
        } else if (content.text && typeof content.text === 'string') {
          contentText = content.text;
        } else {
          // 将对象转换为字符串
          contentText = JSON.stringify(content);
        }
      }

      const contentLower = contentText.toLowerCase();

      // 基于关键词匹配计算相关性分数
      for (const term of searchTerms) {
        if (term.length < 2) continue; // 跳过太短的词

        // 全词匹配给予更高分数
        if (contentLower.includes(term)) {
          relevanceScore += 2;
        }
        // 部分匹配也给予一些分数
        else if (term.length > 3) {
          for (let i = 0; i < term.length - 2; i++) {
            const subTerm = term.substring(i, i + 3);
            if (contentLower.includes(subTerm)) {
              relevanceScore += 0.5;
              break;
            }
          }
        }
      }

      // 对特定工具类型结果增加权重
      if (toolName === 'visit-link') relevanceScore *= 1.5;
      if (toolName === 'deep-dive') relevanceScore *= 1.3;

      // 如果内容包含URL，加分（有可能是更重要的来源）
      if (extractedUrl) relevanceScore += 1;

      // 内容长度也是一个因素 - 更长的内容可能包含更多相关信息
      relevanceScore += Math.min(3, contentText.length / 1000);

      // 添加具有最低相关性的结果
      if (relevanceScore > 0) {
        relevantResults.push({
          toolName: result.name,
          content: result.content,
          relevanceScore,
          url: extractedUrl,
        });
      }
    }

    // 按相关性分数排序（最高在前）
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
        temperature: 0.5, // 稍微提高温度以增加创造性
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content },
        ],
        max_tokens: 3000, // 增加token限制以生成更详细的内容
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
      // 确定使用的语言
      const useChinese = query.match(/[\u4e00-\u9fa5]/) !== null;

      const prompt = useChinese
        ? '你是一位专业的研究报告架构设计师。基于给定的查询和收集到的信息，' +
          '设计一个详细的报告结构。返回一个JSON对象，包含报告标题、主要章节和每个章节的子章节。' +
          '章节结构应从收集的信息中自然涌现，确保覆盖所有重要方面。' +
          '返回的JSON格式为: {"title": "报告标题", "sections": ["章节1", "章节2", ...], ' +
          '"subsections": {"章节1": ["子章节1.1", "子章节1.2"], "章节2": ["子章节2.1", "子章节2.2"]}}'
        : 'You are a professional research report architect. Based on the given query and collected information, ' +
          'design a detailed report structure. Return a JSON object containing the report title, main sections, and subsections for each main section. ' +
          'The section structure should naturally emerge from the collected information, ensuring coverage of all important aspects. ' +
          'The returned JSON format should be: {"title": "Report Title", "sections": ["Section 1", "Section 2", ...], ' +
          '"subsections": {"Section 1": ["Subsection 1.1", "Subsection 1.2"], "Section 2": ["Subsection 2.1", "Subsection 2.2"]}}';

      const response = await llmClient.chat.completions.create({
        model: modelName,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: `用户查询: ${query}\n\n` + `收集的信息概要: ${content.substring(0, 3000)}...`,
          },
        ],
      });

      const structureContent = response.choices[0]?.message?.content || '';

      try {
        const structure = JSON.parse(structureContent);

        // 验证结构
        return {
          title:
            structure.title ||
            (useChinese
              ? `研究报告：${query.substring(0, 50)}`
              : `Research Report: ${query.substring(0, 50)}`),
          sections: Array.isArray(structure.sections)
            ? structure.sections
            : useChinese
              ? ['概述', '主要发现', '详细分析', '应用场景', '结论']
              : [
                  'Overview',
                  'Main Findings',
                  'Detailed Analysis',
                  'Application Scenarios',
                  'Conclusion',
                ],
          subsections: structure.subsections || {},
        };
      } catch (e) {
        console.error(`Error parsing report structure: ${e}`);
        return {
          title: useChinese
            ? `研究报告：${query.substring(0, 50)}`
            : `Research Report: ${query.substring(0, 50)}`,
          sections: useChinese
            ? ['概述', '主要发现', '详细分析', '应用场景', '结论']
            : [
                'Overview',
                'Main Findings',
                'Detailed Analysis',
                'Application Scenarios',
                'Conclusion',
              ],
        };
      }
    } catch (error) {
      console.error(`Error generating report structure: ${error}`);
      const useChinese = query.match(/[\u4e00-\u9fa5]/) !== null;
      return {
        title: useChinese
          ? `研究报告：${query.substring(0, 50)}`
          : `Research Report: ${query.substring(0, 50)}`,
        sections: useChinese
          ? ['概述', '主要发现', '详细分析', '应用场景', '结论']
          : [
              'Overview',
              'Main Findings',
              'Detailed Analysis',
              'Application Scenarios',
              'Conclusion',
            ],
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

    // 过滤无效图片
    const validImages = images.filter(
      (img) =>
        img.src &&
        img.src.startsWith('http') &&
        (img.width === undefined || img.width > 100) &&
        (img.height === undefined || img.height > 100),
    );

    if (validImages.length === 0) {
      return '';
    }

    // 基于关键词匹配为图片评分
    const scoredImages = validImages.map((img) => {
      let score = 0;
      const text = ((img.caption || '') + ' ' + (img.alt || '')).toLowerCase();

      // 匹配关键词
      relevanceKeywords.forEach((keyword) => {
        if (text.includes(keyword.toLowerCase())) {
          score += 2;
        }
        // 部分匹配也给一些分数
        else if (keyword.length > 4 && text.includes(keyword.substring(0, 4).toLowerCase())) {
          score += 1;
        }
      });

      // 有标题或描述的图片更有价值
      if (img.caption && img.caption.length > 5) score += 2;
      if (img.alt && img.alt.length > 5) score += 1;

      // 避免完全相同的图片URL
      const uniqueUrlBonus = 1;

      return { ...img, score: score + uniqueUrlBonus + Math.random() * 0.5 }; // 添加一些随机性
    });

    // 按分数排序（最高在前）并限制数量
    const topImages = scoredImages
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, maxImages);

    // 格式化为markdown
    return topImages
      .map((img) => {
        // 优化图片标题
        let caption = img.caption || img.alt || '相关图片';

        // 避免过长的标题
        if (caption.length > 100) {
          caption = caption.substring(0, 97) + '...';
        }

        // 添加图片来源页面信息
        const sourceInfo = img.pageUrl ? `\n*来源: ${img.pageUrl}*` : '';

        return `![${img.alt || caption}](${img.src})\n*${caption}*${sourceInfo}\n\n`;
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
