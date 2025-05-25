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

/**
 * DeepResearchAgent extends the plan-and-solve agent pattern with advanced research capabilities
 * and optimized report generation
 */
export class DeepResearchAgent extends Agent {
  private currentPlan: PlanStep[] = [];
  private taskCompleted = false;
  private originalQuery = '';

  constructor(options: AgentOptions) {
    super({
      ...options,
      instructions: `${options.instructions || ''}

You are a methodical research agent that follows a plan-and-solve approach. First create a plan with steps, then execute each step in order. As you work:
1. Update the plan as you learn new information
2. Mark steps as completed when they are done
3. Use the most appropriate tools for each research task
4. When ALL steps are complete, generate a comprehensive final report

IMPORTANT CONSTRAINTS:
- Create AT MOST 3-4 key steps in your plan
- Focus on information gathering and deep analysis
- Aim for depth and quality in your research, not just breadth
- Always use tools strategically based on the specific research needs

The plan data structure consists of an array of steps, where each step must have:
- "content": A detailed description of what needs to be done
- "done": A boolean flag indicating completion status (true/false)

Use your advanced tools:
1. web-search: Enhanced search with domain filtering, time range options, and result deduplication
2. visit-link: Extract content from specific URLs with different extraction modes
3. deep-dive: Conduct comprehensive analysis of specific topics with focused insights

When ready to create the final report, analyze all gathered information and create a well-structured, comprehensive report that addresses the user's query with depth and accuracy.`,
    });

    // Register the report generation tool
    this.registerTool(
      new Tool({
        id: 'finalReport',
        description: 'Generate a comprehensive final report after all plan steps are completed',
        parameters: z.object({
          title: z.string().optional().describe('Title for the report'),
          format: z
            .enum(['detailed', 'concise'])
            .optional()
            .describe('Report format: detailed or concise'),
        }),
        function: async ({ title, format = 'detailed' }) => {
          return this.generateFinalReport(title, format);
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
  }

  /**
   * Hook called at the beginning of each agent loop iteration
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    await super.onEachAgentLoopStart(sessionId);

    if (this.taskCompleted) {
      return;
    }

    // Capture the original query on first iteration
    if (this.getCurrentLoopIteration() === 1) {
      const userEvents = this.getEventStream().getEventsByType([EventType.USER_MESSAGE]);
      if (userEvents.length > 0) {
        const userEvent = userEvents[0] as UserMessageEvent;
        this.originalQuery =
          typeof userEvent.content === 'string'
            ? userEvent.content
            : JSON.stringify(userEvent.content);
      }

      await this.generateInitialPlan(sessionId);
    } else {
      await this.updatePlan(sessionId);
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
      // Request the LLM to create an initial plan with steps
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          ...messages,
          {
            role: 'user',
            content:
              "Create a comprehensive research plan to address the user's request. " +
              'Return a JSON object with an array of steps. Each step should have a "content" field ' +
              'describing what needs to be done and a "done" field set to false.\n\n' +
              'IMPORTANT GUIDELINES:\n' +
              '- Create 3-4 strategic research steps\n' +
              '- Make sure steps build on each other logically\n' +
              '- Consider using web-search, visit-link, and deep-dive tools strategically\n' +
              '- Focus on depth and quality of research',
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

      // Store the plan
      this.currentPlan = Array.isArray(planData.steps)
        ? planData.steps.map((step: any) => ({
            content: step.content || 'Unknown step',
            done: false,
          }))
        : [];

      // Send plan update event
      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);

      // Send a system event for better visibility
      const systemEvent = this.getEventStream().createEvent(EventType.SYSTEM, {
        level: 'info',
        message: `Research plan created with ${this.currentPlan.length} steps`,
        details: { plan: this.currentPlan },
      });
      this.getEventStream().sendEvent(systemEvent);
    } catch (error) {
      this.logger.error(`Error generating initial plan: ${error}`);

      // Create a minimal default plan if generation fails
      this.currentPlan = [{ content: 'Conduct comprehensive research on the topic', done: false }];

      const updateEvent = this.getEventStream().createEvent(EventType.PLAN_UPDATE, {
        sessionId,
        steps: this.currentPlan,
      });
      this.getEventStream().sendEvent(updateEvent);
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
              'Evaluate the current research progress and update the plan. ' +
              'Return a JSON object with an array of steps, marking completed steps as "done": true. ' +
              'Add new steps if needed. If all steps are complete, include a "completed": true field ' +
              'and a "summary" field with a final summary.',
          },
          {
            role: 'system',
            content: `Current plan: ${JSON.stringify({ steps: this.currentPlan })}`,
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

      // Update the plan
      if (Array.isArray(planData.steps)) {
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

      // Check if the plan is completed
      const allStepsDone = this.currentPlan.every((step) => step.done);
      this.taskCompleted = allStepsDone && Boolean(planData.completed);

      if (this.taskCompleted) {
        // Send plan finish event
        const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
          sessionId,
          summary: planData.summary || 'Research completed successfully',
        });
        this.getEventStream().sendEvent(finishEvent);
      }
    } catch (error) {
      this.logger.error(`Error updating plan: ${error}`);
    }
  }

  /**
   * Generate a modular final report based on all collected information
   */
  private async generateFinalReport(
    title?: string,
    format: 'detailed' | 'concise' = 'detailed',
  ): Promise<string> {
    this.logger.info('Generating final comprehensive report');

    // Request loop termination to allow proper completion
    this.requestLoopTermination();

    const { llmClient, resolvedModel } = this.getLLMClientAndResolvedModel();

    // Get all relevant tool results
    const toolResults = this.getEventStream().getEventsByType([
      EventType.TOOL_RESULT,
    ]) as ToolResultEvent[];

    // Filter relevant information based on the original query
    const relevantInfo = ReportGenerator.filterRelevantInformation(toolResults, this.originalQuery);

    // Generate report sections in parallel
    try {
      // 1. Generate executive summary
      const executiveSummaryPrompt =
        '你是一个专业的研究报告摘要生成器。生成一个简洁的执行摘要，突出主要发现和关键洞察。' +
        '摘要应该高度概括，长度约300-500字。';

      // 2. Generate detailed analysis section
      const detailedAnalysisPrompt =
        '你是一个专业的研究分析师。根据提供的所有信息，生成一份详细分析部分，深入探讨所有重要发现。' +
        '使用清晰的结构，并引用特定的数据点和信息来源。确保分析全面、系统且有深度。';

      // 3. Generate insights section
      const insightsPrompt =
        '你是一个见解专家。基于研究结果，提炼出关键见解和重要观察。' +
        '重点关注非显而易见的模式、趋势和含义。格式应为清晰的要点列表，每个见解都有简短解释。';

      // 4. Generate recommendations section if applicable
      const recommendationsPrompt =
        '你是一个战略顾问。根据研究发现，提供实用的、基于证据的建议。' +
        '确保建议具体、可行且直接源自研究结果。格式应为有条理的列表，每条建议都有简短理由。';

      // 5. Generate conclusion
      const conclusionPrompt =
        '你是一个总结专家。创建一个简洁有力的结论，概括研究的关键发现和重要性。' +
        '避免引入新信息，而是聚焦于研究的整体意义。长度应在200-300字左右。';

      // Prepare the content for the LLM
      let contentStr = '用户的原始查询是：' + this.originalQuery + '\n\n';
      contentStr += '以下是我们收集到的所有信息：\n\n';

      relevantInfo.forEach((info, index) => {
        contentStr += `来源 ${index + 1}：${info.toolName}\n`;
        contentStr +=
          typeof info.content === 'string' ? info.content : JSON.stringify(info.content, null, 2);
        contentStr += '\n\n';
      });

      // Generate report sections in parallel for better performance
      const [executiveSummary, detailedAnalysis, insights, recommendations, conclusion] =
        await Promise.all([
          ReportGenerator.generateSection(
            llmClient,
            resolvedModel.model,
            executiveSummaryPrompt,
            contentStr,
          ),
          ReportGenerator.generateSection(
            llmClient,
            resolvedModel.model,
            detailedAnalysisPrompt,
            contentStr,
          ),
          ReportGenerator.generateSection(
            llmClient,
            resolvedModel.model,
            insightsPrompt,
            contentStr,
          ),
          ReportGenerator.generateSection(
            llmClient,
            resolvedModel.model,
            recommendationsPrompt,
            contentStr,
          ),
          ReportGenerator.generateSection(
            llmClient,
            resolvedModel.model,
            conclusionPrompt,
            contentStr,
          ),
        ]);

      // Assemble the report based on format
      const reportTitle = title || `研究报告：${this.originalQuery.substring(0, 50)}`;

      let finalReport = `# ${reportTitle}\n\n`;

      finalReport += `## 执行摘要\n\n${executiveSummary}\n\n`;

      if (format === 'detailed') {
        finalReport += `## 详细分析\n\n${detailedAnalysis}\n\n`;
        finalReport += `## 关键见解\n\n${insights}\n\n`;
        finalReport += `## 建议\n\n${recommendations}\n\n`;
      }

      finalReport += `## 结论\n\n${conclusion}\n\n`;

      // Add sources section
      finalReport += `## 信息来源\n\n`;

      const sources = toolResults
        .filter(
          (result) =>
            result.name === 'web-search' ||
            result.name === 'visit-link' ||
            result.name === 'deep-dive',
        )
        .map((result) => {
          const content = result.content;

          // Extract URL from content
          let url = '';
          if (typeof content === 'object' && content !== null) {
            if ('url' in content) {
              url = String(content.url);
            } else if ('results' in content && Array.isArray(content.results)) {
              url = content.results.map((r: any) => r.url).join(', ');
            }
          }

          return `- ${result.name}: ${url || '未提供URL'}`;
        });

      finalReport += sources.join('\n');

      // Send plan finish event with the report as summary
      const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
        sessionId: 'final-report',
        summary: finalReport,
      });
      this.getEventStream().sendEvent(finishEvent);

      return finalReport;
    } catch (error) {
      this.logger.error(`Error generating final report: ${error}`);
      return `生成最终报告时出错: ${error}`;
    }
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
}
