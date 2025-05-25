/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenAI } from 'openai';
import { ToolResultEvent } from '@multimodal/agent';
import { ReportGenerator } from './report-generator';
import { ContentProcessor } from '../utils/content-processor';
import { Logger } from '@agent-infra/logger';

/**
 * 研究主题类型
 */
export interface ResearchTopic {
  mainTopic: string;
  subtopics: string[];
  keywords: string[];
  language: string;
}

/**
 * 报告内容类型
 */
export interface CollectedResearchData {
  originalQuery: string;
  researchTopic: ResearchTopic | null;
  contentCollections: Map<string, string[]>;
  visitedUrls: Map<string, any>;
  collectedImages: any[];
  toolResults: ToolResultEvent[];
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
 * 报告章节内容
 */
export interface ReportSection {
  title: string;
  content: string;
}

/**
 * 最终报告生成器 - 从研究数据创建结构化研究报告
 */
export class FinalReportGenerator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * 生成最终研究报告
   * @param llmClient OpenAI客户端
   * @param resolvedModel 模型信息
   * @param researchData 收集的研究数据
   * @param options 报告生成选项
   * @returns 生成的最终报告
   */
  public async generateReport(
    llmClient: OpenAI,
    resolvedModel: { model: string },
    researchData: CollectedResearchData,
    options: ReportGenerationOptions = {},
  ): Promise<string> {
    this.logger.info('====================================');
    this.logger.info('开始生成最终综合报告');
    this.logger.info('====================================');

    try {
      // 1. 准备报告生成数据
      this.logger.info('第1步: 准备报告数据');
      const reportData = await this.prepareReportData(researchData);
      this.logger.info(`准备了 ${reportData.contentForLLM.length} 字符的内容用于生成报告`);

      // 2. 设计报告结构
      this.logger.info('第2步: 设计报告结构');
      const reportStructure = await this.designReportStructure(
        llmClient,
        resolvedModel,
        reportData,
        options,
      );
      this.logger.info(`报告结构包含 ${reportStructure.sections.length} 个章节`);
      this.logger.info(`标题: ${reportStructure.title}`);
      this.logger.info(`章节: ${reportStructure.sections.join(', ')}`);

      // 3. 生成报告内容
      this.logger.info('第3步: 生成各章节内容');
      const reportSections = await this.generateReportSections(
        llmClient,
        resolvedModel,
        reportData,
        reportStructure,
      );
      this.logger.info(`成功生成 ${reportSections.length} 个章节内容`);

      // 4. 组装最终报告
      this.logger.info('第4步: 组装最终报告');
      const finalReport = this.assembleReport(reportStructure.title, reportSections, reportData);
      this.logger.info(`最终报告生成完成，长度: ${finalReport.length} 字符`);
      this.logger.info('====================================');

      return finalReport;
    } catch (error) {
      this.logger.error(`生成最终报告时出错: ${error}`);

      // 记录详细的错误信息
      if (error instanceof Error) {
        this.logger.error(`错误详情: ${error.stack || error.message}`);
      }

      const language =
        researchData.researchTopic?.language ||
        (researchData.originalQuery.match(/[\u4e00-\u9fa5]/) ? 'chinese' : 'english');

      return language === 'chinese'
        ? `生成最终报告时出错: ${error}`
        : `Error generating final report: ${error}`;
    }
  }

  /**
   * 准备报告生成所需的数据
   */
  private async prepareReportData(researchData: CollectedResearchData): Promise<{
    contentForLLM: string;
    language: string;
    queryKeywords: string[];
    relevantImages: any[];
    relevantInfo: any[];
  }> {
    // 确定报告语言
    const language =
      researchData.researchTopic?.language ||
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
    let queryKeywords: string[] = [];
    if (researchData.researchTopic) {
      // 使用研究主题关键词
      queryKeywords = [
        ...researchData.researchTopic.keywords,
        ...researchData.researchTopic.mainTopic.split(/\s+/),
        ...researchData.researchTopic.subtopics.flatMap((topic) => topic.split(/\s+/)),
      ];
    } else {
      // 从原始查询中提取
      queryKeywords = researchData.originalQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3);
    }

    // 去重并保留最重要的关键词
    queryKeywords = [...new Set(queryKeywords)].filter((word) => word.length > 2).slice(0, 15);
    this.logger.info(`提取的关键词: ${queryKeywords.join(', ')}`);

    // 为报告查找相关图片
    const relevantImages = ContentProcessor.findRelevantImages(
      researchData.collectedImages,
      queryKeywords,
      6, // 增加最大图片数量
    );
    this.logger.info(
      `从 ${researchData.collectedImages.length} 张图片中找到 ${relevantImages.length} 张相关图片`,
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
      queryKeywords,
      relevantImages,
      relevantInfo,
    };
  }

  /**
   * 准备发送给LLM的内容文本
   */
  private prepareContentForLLM(
    researchData: CollectedResearchData,
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

    // 添加主题信息
    if (researchData.researchTopic) {
      contentForLLM +=
        language === 'chinese'
          ? '主要研究主题：' + researchData.researchTopic.mainTopic + '\n'
          : 'Main research topic: ' + researchData.researchTopic.mainTopic + '\n';

      if (researchData.researchTopic.subtopics.length > 0) {
        contentForLLM +=
          language === 'chinese'
            ? '子主题：' + researchData.researchTopic.subtopics.join(', ') + '\n'
            : 'Subtopics: ' + researchData.researchTopic.subtopics.join(', ') + '\n';
      }

      contentForLLM += '\n';
    }

    // 添加按主题组织的内容
    if (researchData.contentCollections.size > 0) {
      contentForLLM +=
        language === 'chinese'
          ? '以下是按主题收集的研究内容：\n\n'
          : 'Below is the research content collected by topic:\n\n';

      // 先添加主要内容
      const mainContent = researchData.contentCollections.get('main');
      if (mainContent && mainContent.length > 0) {
        contentForLLM += language === 'chinese' ? '## 主要内容\n\n' : '## Main Content\n\n';
        this.logger.info(`主要内容收集: ${mainContent.length} 个段落`);

        // 使用内容处理器合并去重
        contentForLLM += ContentProcessor.mergeContents(mainContent, 6000) + '\n\n';
      }

      // 添加子主题内容
      for (const [topic, contentArray] of researchData.contentCollections.entries()) {
        if (topic !== 'main' && contentArray.length > 0) {
          contentForLLM += `## ${topic}\n\n`;
          this.logger.info(`主题 "${topic}" 收集: ${contentArray.length} 个段落`);
          contentForLLM += ContentProcessor.mergeContents(contentArray, 3000) + '\n\n';
        }
      }
    } else {
      // 如果没有按主题组织的内容，使用过滤后的工具结果
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
    }

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
    if (researchData.visitedUrls.size > 0) {
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
    reportData: { contentForLLM: string; language: string },
    options: ReportGenerationOptions,
  ): Promise<{ title: string; sections: string[] }> {
    const { language, contentForLLM } = reportData;
    let { title, sections } = options;

    // 如果没有指定章节，请求LLM设计报告结构
    if (!sections || sections.length === 0) {
      this.logger.info('请求LLM设计报告结构...');

      // 请求LLM设计报告结构
      const structurePrompt =
        language === 'chinese'
          ? '你是一位专业的研究报告架构设计师。基于给定的查询和收集到的信息，' +
            '设计一个合适的报告结构。返回一个JSON对象，包含报告标题和各个章节。' +
            '章节结构应从收集的信息中自然涌现，而不是强制使用固定模板。' +
            '为确保报告内容丰富且有足够深度，请设计5-8个主要章节，每个章节下可以有2-3个子章节。' +
            '返回的JSON格式为: {"title": "报告标题", "sections": ["章节1", "章节2", ...]}'
          : 'You are a professional research report architect. Based on the given query and collected information, ' +
            'design an appropriate report structure. Return a JSON object containing the report title and sections. ' +
            'The section structure should naturally emerge from the collected information rather than forcing a fixed template. ' +
            'To ensure the report is rich in content and has sufficient depth, please design 5-8 main sections, each with 2-3 subsections. ' +
            'The returned JSON format should be: {"title": "Report Title", "sections": ["Section 1", "Section 2", ...]}';

      const reportStructureResponse = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: structurePrompt },
          { role: 'user', content: contentForLLM },
        ],
      });

      // 解析报告结构
      const structureContent =
        reportStructureResponse.choices[0]?.message?.content || language === 'chinese'
          ? '{"title":"研究报告","sections":["背景介绍","主要发现","详细分析","应用场景","总结与建议"]}'
          : '{"title":"Research Report","sections":["Background","Main Findings","Detailed Analysis","Application Scenarios","Conclusion"]}';

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
    }

    // 如果没有提供标题，使用默认标题
    if (!title) {
      title =
        language === 'chinese'
          ? `研究报告：${contentForLLM.substring(0, 50)}`
          : `Research Report: ${contentForLLM.substring(0, 50)}`;
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
    reportData: { contentForLLM: string; language: string },
    reportStructure: { sections: string[] },
  ): Promise<ReportSection[]> {
    const { contentForLLM, language } = reportData;
    const { sections } = reportStructure;

    // 为每个章节创建内容生成提示
    const sectionPrompts = sections.map((sectionTitle) => {
      return language === 'chinese'
        ? `你是一位专业的研究报告撰写者。基于提供的所有信息，撰写报告的"${sectionTitle}"章节。
          章节内容应该基于收集的信息，深入、全面且有洞察力。
          生成至少800-1200字的内容，包括多个子部分。
          确保内容具体详实，不要泛泛而谈。
          使用事实和数据支持你的论点，适当引用信息来源。
          如有必要，可以使用markdown格式添加表格、列表和子标题。`
        : `You are a professional research report writer. Based on all the information provided, write the "${sectionTitle}" section of the report.
          The section content should be deep, comprehensive, and insightful based on the collected information.
          Generate at least 800-1200 words of content, including multiple subsections.
          Ensure the content is specific and detailed, not vague or general.
          Use facts and data to support your arguments, and cite information sources appropriately.
          If necessary, use markdown format to add tables, lists, and subtitles.`;
    });

    // 生成每个章节的内容 - 使用顺序处理以节省内存
    const generatedSections: ReportSection[] = [];

    for (let i = 0; i < sections.length; i++) {
      const sectionTitle = sections[i];
      const sectionPrompt = sectionPrompts[i];

      this.logger.info(`开始生成章节 [${i + 1}/${sections.length}]: ${sectionTitle}`);

      try {
        const startTime = Date.now();

        const sectionContent = await llmClient.chat.completions.create({
          model: resolvedModel.model,
          temperature: 0.7, // 稍微提高创造性
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
      visitedUrls?: Map<string, any>;
    },
  ): string {
    const { language, relevantImages } = reportData;

    // 组装最终报告
    let finalReport = `# ${title}\n\n`;

    // 添加目录
    finalReport += language === 'chinese' ? '## 目录\n\n' : '## Table of Contents\n\n';

    sections.forEach((section, index) => {
      finalReport += `${index + 1}. [${section.title}](#${section.title.toLowerCase().replace(/\s+/g, '-')})\n`;
    });

    finalReport +=
      language === 'chinese'
        ? `${sections.length + 1}. [相关图片](#相关图片)\n` +
          `${sections.length + 2}. [信息来源](#信息来源)\n\n`
        : `${sections.length + 1}. [Related Images](#related-images)\n` +
          `${sections.length + 2}. [Information Sources](#information-sources)\n\n`;

    // 添加章节内容
    sections.forEach((section) => {
      finalReport += `## ${section.title}\n\n${section.content}\n\n`;
    });

    // 添加图片部分
    finalReport += language === 'chinese' ? `## 相关图片\n\n` : `## Related Images\n\n`;

    if (relevantImages.length > 0) {
      finalReport += ContentProcessor.processImagesForMarkdown(relevantImages);
    } else {
      finalReport +=
        language === 'chinese'
          ? '*在研究过程中未收集到相关图片*\n\n'
          : '*No relevant images were collected during the research*\n\n';
    }

    // 添加来源部分
    finalReport += language === 'chinese' ? `## 信息来源\n\n` : `## Information Sources\n\n`;

    // 收集所有URL
    const allUrls = new Set<string>();

    // 从visitedUrls中收集URL
    if (reportData.visitedUrls) {
      for (const url of reportData.visitedUrls.keys()) {
        allUrls.add(url);
      }
    }

    // 将URL列表转换为markdown格式
    const urlsList = [...allUrls].map((url) => `- [${url}](${url})`);

    if (urlsList.length > 0) {
      finalReport += urlsList.join('\n');
    } else {
      finalReport +=
        language === 'chinese'
          ? '*未记录特定的URL来源*'
          : '*No specific URL sources were recorded*';
    }

    return finalReport;
  }
}
