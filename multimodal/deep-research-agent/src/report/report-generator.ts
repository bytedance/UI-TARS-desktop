/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { z, Tool, OpenAI } from '@multimodal/agent';
import { ToolResultEvent } from '@multimodal/agent';
import { ContentProcessor } from '../utils/content-processor';
import { Logger } from '@agent-infra/logger';

/**
 * 报告章节接口
 */
export interface ReportSection {
  title: string;
  content: string;
}

/**
 * 报告结构接口
 */
export interface ReportStructure {
  title: string;
  sections: string[];
}

/**
 * 研究数据接口，包含所有收集的研究信息
 */
export interface ResearchData {
  originalQuery: string;
  toolResults: ToolResultEvent[];
  visitedUrls?: Map<string, any>;
  collectedImages?: any[];
  language?: string;
}

/**
 * 报告生成选项
 */
export interface ReportGenerationOptions {
  title?: string;
  format?: 'detailed' | 'concise';
  sections?: string[];
}

/**
 * 统一的报告生成器类，合并了以前的两个生成器的功能
 */
export class ReportGenerator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 生成最终研究报告
   * @param title 可选的报告标题
   * @param format 报告格式（详细或简洁）
   * @param sections 可选的指定章节
   * @returns 生成的最终报告内容
   */
  public async generateReport(
    title?: string,
    format: 'detailed' | 'concise' = 'detailed',
    sections?: string[],
  ): Promise<string> {
    // 这个方法是为了兼容旧的接口，实际实现会在代理类中调用完整版本
    return '报告生成将由代理直接处理';
  }

  /**
   * 完整的报告生成方法
   */
  public async generateFullReport(
    llmClient: OpenAI,
    resolvedModel: { model: string },
    researchData: ResearchData,
    options: ReportGenerationOptions = {},
  ): Promise<string> {
    this.logger.info('====================================');
    this.logger.info('开始生成最终综合报告');
    this.logger.info('====================================');

    try {
      // 1. 准备报告数据
      this.logger.info('第1步: 准备报告数据');
      const preparedData = await this.prepareReportData(researchData);
      this.logger.info(`准备了 ${preparedData.contentForLLM.length} 字符的内容用于生成报告`);

      // 2. 设计报告结构
      this.logger.info('第2步: 设计报告结构');
      const reportStructure = await this.designReportStructure(
        llmClient,
        resolvedModel,
        preparedData.contentForLLM,
        preparedData.language,
        options,
      );
      this.logger.info(`报告结构包含 ${reportStructure.sections.length} 个章节`);
      this.logger.info(`标题: ${reportStructure.title}`);

      // 3. 生成各章节内容
      this.logger.info('第3步: 生成各章节内容');
      const reportSections = await this.generateReportSections(
        llmClient,
        resolvedModel,
        preparedData.contentForLLM,
        preparedData.language,
        reportStructure,
      );
      this.logger.info(`成功生成 ${reportSections.length} 个章节内容`);

      // 4. 组装最终报告
      this.logger.info('第4步: 组装最终报告');
      const finalAnswer = this.assembleReport(reportStructure.title, reportSections, preparedData);
      this.logger.info(`最终报告生成完成，长度: ${finalAnswer.length} 字符`);
      this.logger.info('====================================');

      return finalAnswer;
    } catch (error) {
      this.logger.error(`生成最终报告时出错: ${error}`);

      const language =
        researchData.language ||
        (researchData.originalQuery.match(/[\u4e00-\u9fa5]/) ? 'chinese' : 'english');

      return language === 'chinese'
        ? `生成最终报告时出错: ${error}`
        : `Error generating final report: ${error}`;
    }
  }

  /**
   * 从工具结果中过滤相关信息
   */
  public static filterRelevantInformation(toolResults: ToolResultEvent[], query: string): any[] {
    const relevantResults = [];

    // 从查询中提取关键词
    const queryTerms = query
      .toLowerCase()
      .split(/[\s,.，。:：;；?？!！()\[\]（）【】]+/)
      .filter((term) => term.length >= 2);

    // 提取中文关键词，更好地匹配中文内容
    const chineseTerms = query.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const searchTerms = [...new Set([...queryTerms, ...chineseTerms])];

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

      // 如果内容包含URL，加分（可能是更重要的来源）
      if (extractedUrl) relevanceScore += 1;

      // 内容长度也是一个因素
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
   * 准备报告生成所需的数据
   */
  private async prepareReportData(researchData: ResearchData): Promise<{
    contentForLLM: string;
    language: string;
    relevantImages: any[];
    relevantInfo: any[];
  }> {
    // 确定报告语言
    const language =
      researchData.language ||
      (researchData.originalQuery.match(/[\u4e00-\u9fa5]/) ? 'chinese' : 'english');

    this.logger.info(`报告语言: ${language}`);

    // 从工具结果中过滤相关信息
    const relevantInfo = ReportGenerator.filterRelevantInformation(
      researchData.toolResults,
      researchData.originalQuery,
    );

    this.logger.info(
      `从 ${researchData.toolResults.length} 个工具结果中过滤得到 ${relevantInfo.length} 个相关结果`,
    );

    // 提取查询关键词，用于图片相关性匹配
    const queryKeywords = researchData.originalQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3);

    // 为报告查找相关图片
    const collectedImages = researchData.collectedImages || [];
    const relevantImages = ContentProcessor.findRelevantImages(collectedImages, queryKeywords, 6);

    this.logger.info(
      `从 ${collectedImages.length} 张图片中找到 ${relevantImages.length} 张相关图片`,
    );

    // 准备LLM内容
    let contentForLLM = this.prepareContentForLLM(
      researchData,
      language,
      relevantInfo,
      relevantImages,
    );

    return {
      contentForLLM,
      language,
      relevantImages,
      relevantInfo,
    };
  }

  /**
   * 准备发送给LLM的内容文本
   */
  private prepareContentForLLM(
    researchData: ResearchData,
    language: string,
    relevantInfo: any[],
    relevantImages: any[],
  ): string {
    let contentForLLM = '';

    // 添加用户原始查询
    contentForLLM +=
      language === 'chinese'
        ? '用户的原始查询是：' + researchData.originalQuery + '\n\n'
        : 'Original user query: ' + researchData.originalQuery + '\n\n';

    // 添加从工具结果中提取的信息
    contentForLLM +=
      language === 'chinese'
        ? '以下是收集到的所有信息：\n\n'
        : 'Below is all the information collected:\n\n';

    relevantInfo.forEach((info, index) => {
      contentForLLM +=
        language === 'chinese'
          ? `来源 ${index + 1}：${info.toolName}\n`
          : `Source ${index + 1}: ${info.toolName}\n`;

      contentForLLM +=
        typeof info.content === 'string' ? info.content : JSON.stringify(info.content, null, 2);
      contentForLLM += '\n\n';
    });

    // 添加图片信息
    if (relevantImages.length > 0) {
      contentForLLM +=
        language === 'chinese' ? '\n收集到的相关图片：\n' : '\nRelevant images collected:\n';

      relevantImages.forEach((img, index) => {
        contentForLLM +=
          language === 'chinese'
            ? `图片 ${index + 1}: ${img.src}\n`
            : `Image ${index + 1}: ${img.src}\n`;

        contentForLLM +=
          language === 'chinese'
            ? `描述: ${img.caption || img.alt || '无描述'}\n`
            : `Description: ${img.caption || img.alt || 'No description'}\n`;

        if (img.pageUrl) {
          contentForLLM +=
            language === 'chinese' ? `来源页面: ${img.pageUrl}\n` : `Source page: ${img.pageUrl}\n`;
        }

        contentForLLM += '\n';
      });
    }

    // 添加URL来源
    if (researchData.visitedUrls && researchData.visitedUrls.size > 0) {
      contentForLLM +=
        language === 'chinese' ? '\n访问的URL和来源：\n' : '\nVisited URLs and sources:\n';

      let index = 1;
      for (const [url, data] of researchData.visitedUrls.entries()) {
        contentForLLM += `${index++}. ${url} - ${data.title || 'No title'}\n`;
      }
      contentForLLM += '\n';
    }

    return contentForLLM;
  }

  /**
   * 设计报告结构
   */
  private async designReportStructure(
    llmClient: OpenAI,
    resolvedModel: { model: string },
    contentForLLM: string,
    language: string,
    options: ReportGenerationOptions,
  ): Promise<ReportStructure> {
    let { title, sections } = options;

    // 如果没有指定章节，请求LLM设计报告结构
    if (!sections || sections.length === 0) {
      this.logger.info('请求LLM设计报告结构...');

      // 请求LLM设计报告结构
      const structurePrompt =
        language === 'chinese'
          ? '你是一位专业的研究报告架构设计师。基于给定的查询和收集到的信息，' +
            '设计一个合适的报告结构。返回一个JSON对象，包含报告标题和各个章节。' +
            '章节结构应从收集的信息中自然涌现，确保覆盖所有重要方面。' +
            '返回的JSON格式为: {"title": "报告标题", "sections": ["章节1", "章节2", ...]}'
          : 'You are a professional research report architect. Based on the given query and collected information, ' +
            'design an appropriate report structure. Return a JSON object containing the report title and sections. ' +
            'The section structure should naturally emerge from the collected information, ensuring coverage of all important aspects. ' +
            'The returned JSON format should be: {"title": "Report Title", "sections": ["Section 1", "Section 2", ...]}';

      try {
        const reportStructureResponse = await llmClient.chat.completions.create({
          model: resolvedModel.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: structurePrompt },
            { role: 'user', content: contentForLLM },
          ],
        });

        // 解析报告结构
        const structureContent = reportStructureResponse.choices[0]?.message?.content || '{}';
        this.logger.info(`报告结构生成结果: ${structureContent}`);

        try {
          const reportStructure = JSON.parse(structureContent);
          sections = Array.isArray(reportStructure.sections) ? reportStructure.sections : [];

          this.logger.info(`解析得到 ${sections!.length} 个章节`);

          // 使用生成的标题（如果没有提供）
          if (!title && reportStructure.title) {
            title = reportStructure.title;
            this.logger.info(`使用生成的报告标题: ${title}`);
          }
        } catch (e) {
          this.logger.error(`无法解析报告结构: ${e}`);
          sections =
            language === 'chinese'
              ? ['背景介绍', '主要发现', '详细分析', '应用场景', '总结与建议']
              : [
                  'Background',
                  'Main Findings',
                  'Detailed Analysis',
                  'Application Scenarios',
                  'Conclusion',
                ];
          this.logger.info(`使用默认章节结构: ${sections.join(', ')}`);
        }
      } catch (error) {
        this.logger.error(`获取报告结构时出错: ${error}`);
        sections =
          language === 'chinese'
            ? ['背景介绍', '主要发现', '详细分析', '应用场景', '总结与建议']
            : [
                'Background',
                'Main Findings',
                'Detailed Analysis',
                'Application Scenarios',
                'Conclusion',
              ];
        this.logger.info(`使用默认章节结构: ${sections.join(', ')}`);
      }
    }

    // 如果没有提供标题，使用默认标题
    if (!title) {
      title =
        language === 'chinese'
          ? `研究报告：${contentForLLM.substring(0, 50)}...`
          : `Research Report: ${contentForLLM.substring(0, 50)}...`;
      this.logger.info(`使用默认报告标题: ${title}`);
    }

    return { title, sections: sections || [] };
  }

  /**
   * 为报告生成各章节内容
   */
  private async generateReportSections(
    llmClient: OpenAI,
    resolvedModel: { model: string },
    contentForLLM: string,
    language: string,
    reportStructure: ReportStructure,
  ): Promise<ReportSection[]> {
    const { sections } = reportStructure;
    const generatedSections: ReportSection[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sectionTitle = sections[i];
      this.logger.info(`开始生成章节 [${i + 1}/${sections.length}]: ${sectionTitle}`);

      // 为每个章节创建提示
      const sectionPrompt =
        language === 'chinese'
          ? `你是一位专业的研究报告撰写者。基于提供的所有信息，撰写报告的"${sectionTitle}"章节。
           章节内容应该基于收集的信息，深入、全面且有洞察力。
           生成至少800字的内容，包括相关子部分。
           确保内容具体详实，不要泛泛而谈。
           使用事实和数据支持你的论点，适当引用信息来源。
           如有必要，可以使用markdown格式添加表格、列表和子标题。`
          : `You are a professional research report writer. Based on all the information provided, write the "${sectionTitle}" section of the report.
           The section content should be deep, comprehensive, and insightful based on the collected information.
           Generate at least 800 words of content, including relevant subsections.
           Ensure the content is specific and detailed, not vague or general.
           Use facts and data to support your arguments, and cite information sources appropriately.
           If necessary, use markdown format to add tables, lists, and subtitles.`;

      try {
        const startTime = Date.now();

        const sectionContent = await llmClient.chat.completions.create({
          model: resolvedModel.model,
          temperature: 0.7, // 提高创造性
          messages: [
            { role: 'system', content: sectionPrompt },
            { role: 'user', content: contentForLLM },
          ],
          max_tokens: 4000, // 增加token限制以生成更详细的内容
        });

        const elapsedTime = Math.round((Date.now() - startTime) / 1000);
        this.logger.info(`章节 "${sectionTitle}" 生成完成，用时 ${elapsedTime} 秒`);

        const generatedContent = sectionContent.choices[0]?.message?.content || '';

        if (generatedContent) {
          this.logger.info(`章节 "${sectionTitle}" 内容长度: ${generatedContent.length} 字符`);
        } else {
          this.logger.error(`章节 "${sectionTitle}" 生成失败: 返回内容为空`);
        }

        generatedSections.push({
          title: sectionTitle,
          content:
            generatedContent ||
            (language === 'chinese'
              ? `无法生成"${sectionTitle}"章节内容。`
              : `Unable to generate content for "${sectionTitle}" section.`),
        });
      } catch (error) {
        this.logger.error(`章节 "${sectionTitle}" 生成错误: ${error}`);

        generatedSections.push({
          title: sectionTitle,
          content:
            language === 'chinese'
              ? `生成"${sectionTitle}"章节时出错: ${error}`
              : `Error generating "${sectionTitle}" section: ${error}`,
        });
      }
    }

    return generatedSections;
  }

  /**
   * 组装最终报告
   */
  private assembleReport(
    title: string,
    sections: ReportSection[],
    reportData: {
      language: string;
      relevantImages: any[];
      relevantInfo: any[];
    },
  ): string {
    const { language, relevantImages, relevantInfo } = reportData;

    // 组装最终报告
    let finalAnswer = `# ${title}\n\n`;

    // 添加目录
    finalAnswer += language === 'chinese' ? '## 目录\n\n' : '## Table of Contents\n\n';

    sections.forEach((section, index) => {
      finalAnswer += `${index + 1}. [${section.title}](#${section.title.toLowerCase().replace(/\s+/g, '-')})\n`;
    });

    finalAnswer +=
      language === 'chinese'
        ? `${sections.length + 1}. [相关图片](#相关图片)\n` +
          `${sections.length + 2}. [信息来源](#信息来源)\n\n`
        : `${sections.length + 1}. [Related Images](#related-images)\n` +
          `${sections.length + 2}. [Information Sources](#information-sources)\n\n`;

    // 添加章节内容
    sections.forEach((section) => {
      finalAnswer += `## ${section.title}\n\n${section.content}\n\n`;
    });

    // 添加图片部分
    finalAnswer += language === 'chinese' ? `## 相关图片\n\n` : `## Related Images\n\n`;

    if (relevantImages.length > 0) {
      finalAnswer += ContentProcessor.processImagesForMarkdown(relevantImages);
    } else {
      finalAnswer +=
        language === 'chinese'
          ? '*在研究过程中未收集到相关图片*\n\n'
          : '*No relevant images were collected during the research*\n\n';
    }

    // 添加来源部分
    finalAnswer += language === 'chinese' ? `## 信息来源\n\n` : `## Information Sources\n\n`;

    // 收集所有URL
    const allUrls = new Set<string>();

    // 从相关信息中提取URL
    relevantInfo.forEach((info) => {
      if (info.url) allUrls.add(info.url);
    });

    // 将URL列表转换为markdown格式
    const urlsList = [...allUrls].map((url) => `- [${url}](${url})`);

    if (urlsList.length > 0) {
      finalAnswer += urlsList.join('\n');
    } else {
      finalAnswer +=
        language === 'chinese'
          ? '*未记录特定的URL来源*'
          : '*No specific URL sources were recorded*';
    }

    return finalAnswer;
  }
}

/**
 * 报告生成工具定义
 */
export const ReportGenerationTool = new Tool({
  id: 'generate-report',
  description: '生成最终研究报告',
  parameters: z.object({
    title: z.string().optional().describe('报告标题'),
    format: z.enum(['detailed', 'concise']).optional().describe('报告格式：详细或简洁'),
    sections: z.array(z.string()).optional().describe('报告中要包含的特定章节'),
  }),
  function: async ({ title, format = 'detailed', sections }) => {
    // 这个函数会在代理中实现
    return {
      message: '报告生成将由代理直接处理',
    };
  },
});
