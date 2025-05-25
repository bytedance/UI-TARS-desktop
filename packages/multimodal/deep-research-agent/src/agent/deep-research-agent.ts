/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Agent,
  AgentOptions,
  LogLevel,
  Tool,
  z,
  OpenAI,
  Event,
  EventType,
  ToolResultEvent,
  PlanStep,
  ChatCompletionMessageParam,
  UserMessageEvent,
} from '@multimodal/agent';
import { ReportGenerator } from '../report/report-generator';
import { EnhancedSearchTool } from '../tools/search-tool';
import { EnhancedVisitLinkTool } from '../tools/visit-link-tool';
import { DeepDiveTool } from '../tools/deep-dive-tool';
import { ContentProcessor } from '../utils/content-processor';

// 主题查询的类型
interface ResearchTopic {
  mainTopic: string; // 主要研究主题
  subtopics: string[]; // 子主题
  keywords: string[]; // 关键词
  language: string; // 期望的语言
}

/**
 * DeepResearchAgent extends the plan-and-solve agent pattern with advanced research capabilities
 * and optimized report generation
 */
export class DeepResearchAgent extends Agent {
  private currentPlan: PlanStep[] = [];
  private taskCompleted = false;
  private originalQuery = '';
  private completedStepCount = 0;
  private maxIterationsPerStep = 3;
  private collectedImages: any[] = [];
  private visitedUrls: Map<string, any> = new Map(); // 跟踪已访问的URL和内容
  private researchTopic: ResearchTopic | null = null;
  private contentCollections: Map<string, string[]> = new Map(); // 按主题组织的内容集合

  constructor(options: AgentOptions) {
    super({
      ...options,
      instructions: `${options.instructions || ''}

你是一个方法论严谨的研究代理，遵循计划并执行的方法。首先创建研究计划，然后按顺序执行每个步骤：
1. 随着学习新信息，更新你的计划
2. 完成步骤时标记为已完成
3. 使用最合适的工具完成每项研究任务

重要规则：
- 创建3-6个关键步骤，确保全面覆盖主题
- 每个步骤应简洁、可操作且明确
- 当所有步骤完成后，你必须使用finalReport工具生成最终报告
- 重要：研究结束的唯一正确方式是调用finalReport工具
- 不要在没有调用finalReport工具的情况下结束研究任务

工具使用指南:
- web-search：增强搜索功能，支持域名过滤
- visit-link：从特定URL提取内容，支持不同提取模式
- deep-dive：对特定主题进行全面分析
- finalReport：当且仅当所有步骤完成后，使用此工具生成最终报告

研究过程中，请确保：
1. 从多个可信来源收集信息
2. 提取并保存相关URL作为最终报告的引用
3. 适当收集有用的图片

【核心原则】：当你认为所有研究任务完成后，必须调用finalReport工具生成报告，这是结束任务的唯一正确方式。`,
    });

    // Register the report generation tool
    this.registerTool(
      new Tool({
        id: 'finalReport',
        description:
          'Generate a comprehensive final report ONLY after all plan steps are completed',
        parameters: z.object({
          title: z.string().optional().describe('Title for the report'),
          format: z
            .enum(['detailed', 'concise'])
            .optional()
            .describe('Report format: detailed or concise'),
          sections: z
            .array(z.string())
            .optional()
            .describe('Specific sections to include in the report'),
        }),
        function: async ({ title, format = 'detailed', sections }) => {
          // Check if all steps are completed before generating report
          if (!this.taskCompleted) {
            this.logger.warn(
              'Attempted to generate final report before completing all research steps',
            );

            // Get remaining steps
            const remainingSteps = this.currentPlan
              .filter((step) => !step.done)
              .map((step) => step.content)
              .join(', ');

            return `⚠️ ERROR: Cannot generate final report until all research steps are completed. 
            
Remaining incomplete steps: ${remainingSteps || 'none'}

Please complete all research steps in your plan before generating the final report.`;
          }

          return this.generateFinalReport(title, format, sections);
        },
      }),
    );

    // Register the enhanced tools
    this.registerTool(EnhancedSearchTool);
    this.registerTool(EnhancedVisitLinkTool);
    this.registerTool(DeepDiveTool);
  }

  /**
   * Override initialize to setup any necessary state
   */
  override async initialize(): Promise<void> {
    await super.initialize();
    // Reset state on initialization
    this.currentPlan = [];
    this.taskCompleted = false;
    this.originalQuery = '';
    this.completedStepCount = 0;
    this.collectedImages = [];
    this.visitedUrls = new Map();
    this.researchTopic = null;
    this.contentCollections = new Map();
  }

  /**
   * Hook called at the beginning of each agent loop iteration
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    await super.onEachAgentLoopStart(sessionId);

    if (this.taskCompleted) {
      return;
    }

    // Subscribe to tool results to collect data
    this.collectDataFromToolResults();

    // Capture the original query on first iteration
    if (this.getCurrentLoopIteration() === 1) {
      const userEvents = this.getEventStream().getEventsByType([EventType.USER_MESSAGE]);
      if (userEvents.length > 0) {
        const userEvent = userEvents[0] as UserMessageEvent;
        this.originalQuery =
          typeof userEvent.content === 'string'
            ? userEvent.content
            : JSON.stringify(userEvent.content);

        // 分析研究主题和子主题
        await this.analyzeResearchTopic(sessionId);
      }

      await this.generateInitialPlan(sessionId);
    } else {
      // Check if we need to update plan progress
      await this.updatePlanProgress(sessionId);
    }
  }

  /**
   * 分析研究主题和子主题
   */
  private async analyzeResearchTopic(sessionId: string): Promise<void> {
    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    try {
      // 请求LLM分析查询主题
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '分析用户的研究请求，提取主要研究主题、相关子主题和关键词。' +
              '返回一个JSON对象，包含以下字段：' +
              '- mainTopic: 主要研究主题' +
              '- subtopics: 子主题数组(3-5个)' +
              '- keywords: 关键词数组(5-10个)' +
              '- language: 期望的输出语言("chinese"或"english")',
          },
          {
            role: 'user',
            content: this.originalQuery,
          },
        ],
      });

      // 解析响应
      const content = response.choices[0]?.message?.content || '{}';
      try {
        const topicData = JSON.parse(content);
        this.researchTopic = {
          mainTopic: topicData.mainTopic || '',
          subtopics: Array.isArray(topicData.subtopics) ? topicData.subtopics : [],
          keywords: Array.isArray(topicData.keywords) ? topicData.keywords : [],
          language: topicData.language || 'chinese',
        };

        // 为每个子主题创建内容集合
        this.contentCollections.set('main', []);
        this.researchTopic.subtopics.forEach((topic) => {
          this.contentCollections.set(topic, []);
        });

        this.logger.info(`Research topic analyzed: ${this.researchTopic.mainTopic}`);
        this.logger.info(`Subtopics: ${this.researchTopic.subtopics.join(', ')}`);
      } catch (e) {
        this.logger.error(`Failed to parse research topic: ${e}`);
        // 创建默认研究主题
        this.researchTopic = {
          mainTopic: this.originalQuery.substring(0, 50),
          subtopics: [],
          keywords: [],
          language: this.originalQuery.match(/[\u4e00-\u9fa5]/) ? 'chinese' : 'english',
        };
        this.contentCollections.set('main', []);
      }
    } catch (error) {
      this.logger.error(`Error analyzing research topic: ${error}`);
      // 创建默认研究主题
      this.researchTopic = {
        mainTopic: this.originalQuery.substring(0, 50),
        subtopics: [],
        keywords: [],
        language: this.originalQuery.match(/[\u4e00-\u9fa5]/) ? 'chinese' : 'english',
      };
      this.contentCollections.set('main', []);
    }
  }

  /**
   * Collect data from tool results for use in the final report
   */
  private collectDataFromToolResults(): void {
    const toolResultEvents = this.getEventStream().getEventsByType([
      EventType.TOOL_RESULT,
    ]) as ToolResultEvent[];

    // 处理最近的工具结果事件
    const processedIds = new Set<string>();

    toolResultEvents.forEach((event) => {
      // 跳过已处理的事件
      if (processedIds.has(event.id)) return;
      processedIds.add(event.id);

      // 提取图片
      if (event.name === 'visit-link' && event.content && typeof event.content === 'object') {
        const content = event.content as any;

        // 保存URL和内容的映射关系
        if (content.url) {
          // 避免重复处理相同的URL
          if (!this.visitedUrls.has(content.url)) {
            this.visitedUrls.set(content.url, {
              title: content.title || '',
              content: content.content || '',
              excerpt: content.excerpt || '',
              originalUrl: content.originalUrl || content.url,
            });

            // 添加到相关主题的内容集合
            if (content.content && typeof content.content === 'string') {
              this.addContentToCollections(content.content, content.title || '');
            }
          }
        }

        // 收集图片
        if (content.images && Array.isArray(content.images) && content.images.length > 0) {
          // 添加新图片，避免重复
          const existingUrls = new Set(this.collectedImages.map((img) => img.src));

          content.images.forEach((img: any) => {
            if (img.src && !existingUrls.has(img.src)) {
              this.collectedImages.push(img);
              existingUrls.add(img.src);
            }
          });
        }
      }

      // 处理搜索结果
      else if (event.name === 'web-search' && event.content && typeof event.content === 'object') {
        const content = event.content as any;

        if (content.results && Array.isArray(content.results)) {
          content.results.forEach((result: any) => {
            if (result.content && typeof result.content === 'string') {
              this.addContentToCollections(result.content, result.title || '');
            }
          });
        }
      }

      // 处理深入研究结果
      else if (event.name === 'deep-dive' && event.content && typeof event.content === 'object') {
        const content = event.content as any;

        // 处理发现
        if (content.findings && Array.isArray(content.findings)) {
          content.findings.forEach((finding: any) => {
            if (finding.keyInformation) {
              this.addContentToCollections(finding.keyInformation, finding.title || '');

              // 保存URL
              if (finding.source && !this.visitedUrls.has(finding.source)) {
                this.visitedUrls.set(finding.source, {
                  title: finding.title || '',
                  content: finding.keyInformation || '',
                  originalUrl: finding.source,
                });
              }
            }
          });
        }

        // 处理见解
        if (content.insights && Array.isArray(content.insights)) {
          content.insights.forEach((insight: any) => {
            if (insight.insight && insight.focusArea) {
              // 添加到对应的主题集合
              const collections = this.contentCollections;
              for (const [topic, contentArray] of collections.entries()) {
                if (
                  topic.toLowerCase().includes(insight.focusArea.toLowerCase()) ||
                  insight.focusArea.toLowerCase().includes(topic.toLowerCase())
                ) {
                  contentArray.push(insight.insight);
                  break;
                }
              }

              // 如果没有匹配的主题，添加到主要集合
              if (!collections.get('main')?.includes(insight.insight)) {
                const mainContent = collections.get('main') || [];
                mainContent.push(insight.insight);
                collections.set('main', mainContent);
              }
            }
          });
        }
      }
    });
  }

  /**
   * 将内容添加到相关主题的集合中
   */
  private addContentToCollections(content: string, title: string = ''): void {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return;
    }

    // 如果没有研究主题，添加到主要集合
    if (!this.researchTopic) {
      const mainContent = this.contentCollections.get('main') || [];
      mainContent.push(content);
      this.contentCollections.set('main', mainContent);
      return;
    }

    // 检查内容与哪些主题相关
    let matched = false;

    // 检查每个子主题
    for (const topic of this.researchTopic.subtopics) {
      // 根据主题和内容的相关性决定是否添加
      if (this.isContentRelevantToTopic(content, topic, title)) {
        const topicContent = this.contentCollections.get(topic) || [];
        topicContent.push(content);
        this.contentCollections.set(topic, topicContent);
        matched = true;
      }
    }

    // 如果没有匹配任何子主题，或者内容与主要主题相关，添加到主要集合
    if (!matched || this.isContentRelevantToTopic(content, this.researchTopic.mainTopic, title)) {
      const mainContent = this.contentCollections.get('main') || [];
      mainContent.push(content);
      this.contentCollections.set('main', mainContent);
    }
  }

  /**
   * 判断内容是否与特定主题相关
   */
  private isContentRelevantToTopic(content: string, topic: string, title: string = ''): boolean {
    // 简化的相关性检测
    const topicWords = topic
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    const contentLower = (content + ' ' + title).toLowerCase();

    // 检查主题词在内容中的出现频率
    let matches = 0;
    topicWords.forEach((word) => {
      if (contentLower.includes(word)) {
        matches++;
      }
    });

    // 如果匹配了至少一半的主题词，认为相关
    return matches >= Math.max(1, Math.floor(topicWords.length / 2));
  }

  /**
   * Generate initial research plan
   */
  private async generateInitialPlan(sessionId: string): Promise<void> {
    // Create plan start event
    const startEvent = this.getEventStream().createEvent(EventType.PLAN_START, {
      sessionId,
    });
    this.getEventStream().sendEvent(startEvent);
    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    // Get messages from event stream to understand the task
    const messages = this.getMessages();

    try {
      // 构建主题相关提示
      let topicPrompt = '用户的查询是：' + this.originalQuery + '\n\n';

      if (this.researchTopic) {
        topicPrompt += '主要研究主题：' + this.researchTopic.mainTopic + '\n';

        if (this.researchTopic.subtopics.length > 0) {
          topicPrompt += '相关子主题：' + this.researchTopic.subtopics.join(', ') + '\n';
        }

        if (this.researchTopic.keywords.length > 0) {
          topicPrompt += '关键词：' + this.researchTopic.keywords.join(', ') + '\n';
        }
      }

      // Request the LLM to create an initial plan with steps
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'user',
            content:
              topicPrompt +
              '\n请创建一个详细且全面的研究计划，以解决用户的请求。' +
              '返回一个JSON对象，包含一个steps数组。每个步骤应该有一个"content"字段' +
              '描述需要做什么，以及一个"done"字段设置为false。\n\n' +
              '重要指导方针：\n' +
              '- 创建4-6个战略性研究步骤\n' +
              '- 每个步骤必须简洁(最多15个字)、可操作且明确定义\n' +
              '- 步骤应该逻辑上互相建立\n' +
              '- 考虑战略性地使用web-search、visit-link和deep-dive工具\n' +
              '- 确保计划能够全面覆盖所有子主题和相关方面',
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData;
      try {
        planData = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse plan JSON: ${e}`);
        planData = { steps: [] };
      }

      // Store the plan, ensuring sufficient steps for comprehensive research
      this.currentPlan = Array.isArray(planData.steps)
        ? planData.steps
            .slice(0, 6) // 允许最多6个步骤以提高全面性
            .map((step: any) => ({
              content: step.content || 'Unknown step',
              done: false,
            }))
        : [];

      // Ensure we have at least 3 steps for better coverage
      if (this.currentPlan.length < 3) {
        const defaultSteps = [
          { content: '搜索主要信息和概述', done: false },
          { content: '研究具体项目和贡献者', done: false },
          { content: '分析应用场景和案例', done: false },
        ];

        // 添加缺少的步骤
        for (let i = this.currentPlan.length; i < 3; i++) {
          this.currentPlan.push(defaultSteps[i]);
        }
      }

      // Send plan update event
      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);

      // Send a system event for better visibility
      const systemEvent = this.getEventStream().createEvent(EventType.SYSTEM, {
        level: 'info',
        message: `研究计划已创建，包含 ${this.currentPlan.length} 个步骤`,
        details: { plan: this.currentPlan },
      });
      this.getEventStream().sendEvent(systemEvent);
    } catch (error) {
      this.logger.error(`Error generating initial plan: ${error}`);

      // Create a minimal default plan if generation fails
      this.currentPlan = [
        { content: '搜索主要信息和概述', done: false },
        { content: '研究具体项目和贡献者', done: false },
        { content: '分析应用场景和案例', done: false },
      ];

      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);
    }
  }

  /**
   * Update the plan progress based on recent agent actions
   */
  private async updatePlanProgress(sessionId: string): Promise<void> {
    // If no steps are marked done, check if current step is completed
    const currentStepIndex = this.currentPlan.findIndex((step) => !step.done);

    if (currentStepIndex === -1) {
      // All steps are done, we can move to report generation
      this.taskCompleted = true;
      return;
    }

    // Count iterations spent on current step
    const currentIteration = this.getCurrentLoopIteration();
    const iterationsOnCurrentStep =
      currentIteration - this.completedStepCount * this.maxIterationsPerStep;

    // If we've spent too many iterations on this step, force completion
    if (iterationsOnCurrentStep >= this.maxIterationsPerStep) {
      await this.forceStepCompletion(sessionId, currentStepIndex);
      return;
    }

    // Otherwise do a normal plan update
    await this.updatePlan(sessionId);
  }

  /**
   * Force completion of a step that's taking too long
   */
  private async forceStepCompletion(sessionId: string, stepIndex: number): Promise<void> {
    if (stepIndex >= 0 && stepIndex < this.currentPlan.length) {
      // Mark the step as done
      this.currentPlan[stepIndex].done = true;
      this.completedStepCount++;

      // Log the forced completion
      this.logger.info(
        `Forcing completion of step ${stepIndex + 1}: ${this.currentPlan[stepIndex].content}`,
      );

      // Send system message
      const systemEvent = this.getEventStream().createEvent(EventType.SYSTEM, {
        level: 'info',
        message: `第 ${stepIndex + 1} 步已标记为完成(迭代次数已达上限)`,
        details: { step: this.currentPlan[stepIndex] },
      });
      this.getEventStream().sendEvent(systemEvent);

      // Send plan update event
      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);

      // Check if all steps are complete
      if (this.currentPlan.every((step) => step.done)) {
        this.taskCompleted = true;

        // Send plan finish event
        const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
          sessionId,
          summary: '所有研究步骤已完成，即将生成最终报告。',
        });
        this.getEventStream().sendEvent(finishEvent);
      }
    }
  }

  /**
   * Update the research plan based on current progress
   */
  private async updatePlan(sessionId: string): Promise<void> {
    const messages = this.getMessages();
    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    try {
      // Request the LLM to evaluate and update the plan
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'system',
            content:
              '评估当前研究进度并更新计划。' +
              '返回一个JSON对象，包含steps数组，将已完成的步骤标记为"done": true。' +
              '如果一个步骤已完成或已获得足够信息，将其标记为已完成。' +
              '除非有明确证据表明步骤已彻底完成，否则不要将其标记为已完成。' +
              '除非所有步骤都已标记为完成，否则不要包含"completed"字段。',
          },
          {
            role: 'system',
            content: `当前计划: ${JSON.stringify({ steps: this.currentPlan })}`,
          },
        ],
      });

      // Parse the response
      const content = response.choices[0]?.message?.content || '{"steps":[]}';
      let planData;
      try {
        planData = JSON.parse(content);
      } catch (e) {
        this.logger.error(`Failed to parse plan update JSON: ${e}`);
        planData = { steps: this.currentPlan };
      }

      // Check if any new steps were marked as done
      const previouslyCompleted = this.currentPlan.filter((step) => step.done).length;

      // Update the plan while preserving original step text for completed steps
      if (Array.isArray(planData.steps)) {
        // Ensure we don't lose existing step texts when they're marked complete
        for (let i = 0; i < Math.min(this.currentPlan.length, planData.steps.length); i++) {
          const existingStep = this.currentPlan[i];
          const updatedStep = planData.steps[i];

          // If step was previously not done but now is done, increment counter
          if (!existingStep.done && updatedStep.done) {
            this.completedStepCount++;
          }

          // Preserve original step text for completed steps
          if (existingStep.done || updatedStep.done) {
            planData.steps[i].content = existingStep.content;
          }
        }

        this.currentPlan = planData.steps.map((step: any) => ({
          content: step.content || 'Unknown step',
          done: Boolean(step.done),
        }));
      }

      // Send plan update event
      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);

      // Log if new steps were completed
      const nowCompleted = this.currentPlan.filter((step) => step.done).length;
      if (nowCompleted > previouslyCompleted) {
        this.logger.info(`进度：${nowCompleted}/${this.currentPlan.length} 步骤已完成`);
      }

      // Check if the plan is completed - ONLY if ALL steps are actually done
      const allStepsDone = this.currentPlan.every((step) => step.done);

      this.taskCompleted = allStepsDone && this.currentPlan.length > 0;

      // Explicitly prevent early completion
      if (planData.completed && !allStepsDone) {
        this.logger.warn('Prevented early completion: Not all steps are done yet');
        this.taskCompleted = false;
      }

      if (this.taskCompleted) {
        // Send plan finish event
        const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
          sessionId,
          summary: '所有研究步骤已完成，即将生成最终报告。',
        });
        this.getEventStream().sendEvent(finishEvent);
      }
    } catch (error) {
      this.logger.error(`Error updating plan: ${error}`);
    }
  }

  /**
   * Get LLM client and resolved model
   */
  private getLLMClientAndResolvedModel() {
    const resolvedModel = this.getCurrentResolvedModel()!;
    const llmClient = this.getLLMClient()!;
    return { resolvedModel, llmClient };
  }

  /**
   * Get messages for planning context
   */
  private getMessages(): ChatCompletionMessageParam[] {
    // Get only user and assistant messages to avoid overwhelming the context
    const events = this.getEventStream().getEventsByType([
      EventType.USER_MESSAGE,
      EventType.ASSISTANT_MESSAGE,
      EventType.TOOL_RESULT,
    ]);

    // Convert events to message format
    return events.map<ChatCompletionMessageParam>((event) => {
      if (event.type === EventType.ASSISTANT_MESSAGE) {
        return {
          role: 'assistant',
          content: event.content,
        };
      } else {
        return {
          role: 'user',
          content:
            // @ts-expect-error
            typeof event?.content === 'string' ? event.content : JSON.stringify(event.content),
        };
      }
    });
  }

  /**
   * Generate a modular final report based on all collected information
   */
  private async generateFinalReport(
    title?: string,
    format: 'detailed' | 'concise' = 'detailed',
    sections?: string[],
  ): Promise<string> {
    // Double-check that all steps are complete before generating report
    if (!this.taskCompleted) {
      this.logger.error('Attempted to generate final report before completing all research steps');
      return `Error: Cannot generate final report until all research steps are completed.`;
    }

    this.logger.info('======================================');
    this.logger.info('开始生成最终综合报告');
    this.logger.info('======================================');

    // Request loop termination to allow proper completion
    this.requestLoopTermination();

    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    // Get all relevant tool results
    const toolResults = this.getEventStream().getEventsByType([
      EventType.TOOL_RESULT,
    ]) as ToolResultEvent[];

    // Filter relevant information based on the original query
    const relevantInfo = ReportGenerator.filterRelevantInformation(toolResults, this.originalQuery);
    this.logger.info(
      `从 ${toolResults.length} 个工具结果中过滤得到 ${relevantInfo.length} 个相关结果`,
    );

    try {
      // 确定报告语言
      const language =
        this.researchTopic?.language ||
        (this.originalQuery.match(/[\u4e00-\u9fa5]/) ? 'chinese' : 'english');
      this.logger.info(`报告语言: ${language}`);

      // 提取查询关键词，用于图片相关性匹配
      let queryKeywords: string[] = [];

      if (this.researchTopic) {
        // 使用研究主题关键词
        queryKeywords = [
          ...this.researchTopic.keywords,
          ...this.researchTopic.mainTopic.split(/\s+/),
          ...this.researchTopic.subtopics.flatMap((topic) => topic.split(/\s+/)),
        ];
      } else {
        // 从原始查询中提取
        queryKeywords = this.originalQuery
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 3);
      }

      // 去重并保留最重要的关键词
      queryKeywords = [...new Set(queryKeywords)].filter((word) => word.length > 2).slice(0, 15);
      this.logger.info(`提取的关键词: ${queryKeywords.join(', ')}`);

      // 为报告查找相关图片
      const relevantImages = ContentProcessor.findRelevantImages(
        this.collectedImages,
        queryKeywords,
        6, // 增加最大图片数量
      );
      this.logger.info(
        `从 ${this.collectedImages.length} 张图片中找到 ${relevantImages.length} 张相关图片`,
      );

      // 准备内容汇总
      let contentForLLM = '';

      // 添加用户原始查询
      contentForLLM +=
        language === 'chinese'
          ? '用户的原始查询是：' + this.originalQuery + '\n\n'
          : 'Original user query: ' + this.originalQuery + '\n\n';

      // 添加主题信息
      if (this.researchTopic) {
        contentForLLM +=
          language === 'chinese'
            ? '主要研究主题：' + this.researchTopic.mainTopic + '\n'
            : 'Main research topic: ' + this.researchTopic.mainTopic + '\n';

        if (this.researchTopic.subtopics.length > 0) {
          contentForLLM +=
            language === 'chinese'
              ? '子主题：' + this.researchTopic.subtopics.join(', ') + '\n'
              : 'Subtopics: ' + this.researchTopic.subtopics.join(', ') + '\n';
        }

        contentForLLM += '\n';
      }

      // 添加按主题组织的内容
      if (this.contentCollections.size > 0) {
        contentForLLM +=
          language === 'chinese'
            ? '以下是按主题收集的研究内容：\n\n'
            : 'Below is the research content collected by topic:\n\n';

        // 先添加主要内容
        const mainContent = this.contentCollections.get('main');
        if (mainContent && mainContent.length > 0) {
          contentForLLM += language === 'chinese' ? '## 主要内容\n\n' : '## Main Content\n\n';
          this.logger.info(`主要内容收集: ${mainContent.length} 个段落`);

          // 使用内容处理器合并去重
          contentForLLM += ContentProcessor.mergeContents(mainContent, 6000) + '\n\n';
        }

        // 添加子主题内容
        for (const [topic, contentArray] of this.contentCollections.entries()) {
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
              language === 'chinese'
                ? `来源页面: ${img.pageUrl}\n`
                : `Source page: ${img.pageUrl}\n`;
          }

          contentForLLM += '\n';
        });
      }

      // 添加URL来源
      if (this.visitedUrls.size > 0) {
        contentForLLM +=
          language === 'chinese' ? '\n访问的URL和来源：\n' : '\nVisited URLs and sources:\n';

        let index = 1;
        for (const [url, data] of this.visitedUrls.entries()) {
          contentForLLM += `${index++}. ${url} - ${data.title || 'No title'}\n`;
        }
        contentForLLM += '\n';
      }

      this.logger.info(`准备了 ${contentForLLM.length} 字符的内容用于生成报告`);

      // 如果没有指定章节，请求LLM设计报告结构
      let reportSections: string[] = [];

      if (!reportSections || reportSections.length === 0) {
        this.logger.info('正在设计报告结构...');
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
            {
              role: 'system',
              content: structurePrompt,
            },
            {
              role: 'user',
              content: contentForLLM,
            },
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
          reportSections = Array.isArray(reportStructure.sections) ? reportStructure.sections : [];

          this.logger.info(`解析得到 ${reportSections.length} 个章节`);
          this.logger.info(`章节列表: ${reportSections.join(', ')}`);

          // 使用生成的标题（如果没有提供）
          if (!title && reportStructure.title) {
            title = reportStructure.title;
            this.logger.info(`使用生成的报告标题: ${title}`);
          }
        } catch (e) {
          this.logger.error(`无法解析报告结构: ${e}`);
          reportSections =
            language === 'chinese'
              ? ['背景介绍', '主要发现', '详细分析', '应用场景', '总结与建议']
              : [
                  'Background',
                  'Main Findings',
                  'Detailed Analysis',
                  'Application Scenarios',
                  'Conclusion',
                ];
          this.logger.info(`使用默认章节结构: ${reportSections.join(', ')}`);
        }
      }

      // 如果没有提供标题，使用默认标题
      if (!title) {
        title =
          language === 'chinese'
            ? `研究报告：${this.researchTopic?.mainTopic || this.originalQuery.substring(0, 50)}`
            : `Research Report: ${this.researchTopic?.mainTopic || this.originalQuery.substring(0, 50)}`;
        this.logger.info(`使用默认报告标题: ${title}`);
      }

      // 为每个章节创建内容生成提示
      const sectionPrompts = reportSections.map((sectionTitle) => {
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
      const sections: Array<{ title: string; content: string }> = [];

      for (let i = 0; i < reportSections.length; i++) {
        const sectionTitle = reportSections[i];
        const sectionPrompt = sectionPrompts[i];

        this.logger.info(`开始生成章节 [${i + 1}/${reportSections.length}]: ${sectionTitle}`);
        this.logger.info(`提示内容: ${sectionPrompt.substring(0, 200)}...`);

        try {
          this.logger.info(`正在调用LLM生成章节: ${sectionTitle}`);
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
            this.logger.info(`内容预览: ${generatedContent.substring(0, 150)}...`);
          } else {
            this.logger.error(`章节 "${sectionTitle}" 生成失败: 返回内容为空`);
          }

          sections.push({
            title: sectionTitle,
            content:
              generatedContent || language === 'chinese'
                ? `无法生成"${sectionTitle}"章节内容。`
                : `Unable to generate content for "${sectionTitle}" section.`,
          });
        } catch (error) {
          this.logger.error(`章节 "${sectionTitle}" 生成错误: ${error}`);

          // 记录详细的错误信息
          if (error instanceof Error) {
            this.logger.error(`错误详情: ${error.stack || error.message}`);
          }

          sections.push({
            title: sectionTitle,
            content:
              language === 'chinese'
                ? `生成"${sectionTitle}"章节时出错: ${error}`
                : `Error generating "${sectionTitle}" section: ${error}`,
          });
        }
      }

      this.logger.info('所有章节生成完成，开始组装最终报告');

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

      // 收集所有有效的URL
      const allUrls = new Set<string>();

      // 从工具结果中收集URL
      toolResults
        .filter(
          (result) =>
            result.name === 'web-search' ||
            result.name === 'visit-link' ||
            result.name === 'deep-dive',
        )
        .forEach((result) => {
          const content = result.content;

          // 提取URL
          if (typeof content === 'object' && content !== null) {
            // 从visit-link结果中提取
            if ('url' in content && typeof content.url === 'string') {
              allUrls.add(content.url);
            }
            // 从web-search结果中提取
            else if ('results' in content && Array.isArray(content.results)) {
              content.results.forEach((r: any) => {
                if (r.url && typeof r.url === 'string') {
                  allUrls.add(r.url);
                }
              });
            }
            // 从deep-dive结果中提取
            else if ('findings' in content && Array.isArray(content.findings)) {
              content.findings.forEach((f: any) => {
                if (f.source && typeof f.source === 'string') {
                  allUrls.add(f.source);
                }
              });
            }
          }
        });

      // 添加从visited URLs中收集的URL
      for (const url of this.visitedUrls.keys()) {
        allUrls.add(url);
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

      this.logger.info(`最终报告生成完成，长度: ${finalReport.length} 字符`);
      this.logger.info('======================================');

      // 发送计划完成事件，包含报告作为摘要
      const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
        sessionId: 'final-report',
        summary: finalReport,
      });
      this.getEventStream().sendEvent(finishEvent);

      return finalReport;
    } catch (error) {
      this.logger.error(`生成最终报告时错误: ${error}`);

      // 记录详细的错误信息
      if (error instanceof Error) {
        this.logger.error(`错误详情: ${error.stack || error.message}`);
      }

      return this.researchTopic?.language === 'chinese'
        ? `生成最终报告时出错: ${error}`
        : `Error generating final report: ${error}`;
    }
  }
}
