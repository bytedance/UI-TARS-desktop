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
- Create EXACTLY 2-3 key steps in your plan (never more than 3)
- Each step must be concise, actionable, and clearly defined
- Focus on information gathering and deep analysis
- Each step should be completable within 2-3 iterations
- Always mark a step as done when you've completed it, even if results were limited
- Use tools strategically based on the specific research needs

The plan data structure consists of an array of steps, where each step must have:
- "content": A brief description of what needs to be done (max 15 words)
- "done": A boolean flag indicating completion status (true/false)

Use your advanced tools:
1. web-search: Enhanced search with domain filtering, time range options, and result deduplication
2. visit-link: Extract content from specific URLs with different extraction modes and image support
3. deep-dive: Conduct comprehensive analysis of specific topics with focused insights

When ready to create the final report, analyze all gathered information and create a well-structured report that addresses the user's query with depth and accuracy. Let the report structure emerge from the research findings rather than following a rigid template.`,
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
    // Reset state on initialization
    this.currentPlan = [];
    this.taskCompleted = false;
    this.originalQuery = '';
    this.completedStepCount = 0;
    this.collectedImages = [];
  }

  /**
   * Hook called at the beginning of each agent loop iteration
   */
  override async onEachAgentLoopStart(sessionId: string): Promise<void> {
    await super.onEachAgentLoopStart(sessionId);

    if (this.taskCompleted) {
      return;
    }

    // Subscribe to tool results to collect images
    this.collectImagesFromToolResults();

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
      // Check if we need to update plan progress
      await this.updatePlanProgress(sessionId);
    }
  }

  /**
   * Collect images from tool results for use in the final report
   */
  private collectImagesFromToolResults(): void {
    const toolResultEvents = this.getEventStream().getEventsByType([
      EventType.TOOL_RESULT,
    ]) as ToolResultEvent[];

    // Extract images from visit-link results
    const newVisitLinkEvents = toolResultEvents
      .filter((e) => e.name === 'visit-link' && e.content && typeof e.content === 'object')
      .filter((e) => {
        const content = e.content as any;
        return content.images && Array.isArray(content.images) && content.images.length > 0;
      });

    // Add new images to our collection
    for (const event of newVisitLinkEvents) {
      const content = event.content as any;
      if (content.images && Array.isArray(content.images)) {
        this.collectedImages.push(...content.images);
      }
    }
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
              "Create a concise research plan to address the user's request. " +
              'Return a JSON object with an array of steps. Each step should have a "content" field ' +
              'describing what needs to be done and a "done" field set to false.\n\n' +
              'IMPORTANT GUIDELINES:\n' +
              '- Create EXACTLY 2-3 strategic research steps (never more)\n' +
              '- Each step must be brief (maximum 15 words) and actionable\n' +
              '- Steps should build on each other logically\n' +
              '- Consider using web-search, visit-link, and deep-dive tools strategically',
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

      // Store the plan, but ensure we have at most 3 steps
      this.currentPlan = Array.isArray(planData.steps)
        ? planData.steps
            .slice(0, 3) // Limit to 3 steps maximum
            .map((step: any) => ({
              content: step.content || 'Unknown step',
              done: false,
            }))
        : [];

      // Ensure we have at least one step
      if (this.currentPlan.length === 0) {
        this.currentPlan = [{ content: 'Research key information on the topic', done: false }];
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
        message: `Step ${stepIndex + 1} marked complete due to iteration limit`,
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
          summary: 'All research steps completed, generating final report.',
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
              'Evaluate the current research progress and update the plan. ' +
              'Return a JSON object with an array of steps, marking completed steps as "done": true. ' +
              'If a step is complete or has yielded sufficient information, mark it as done. ' +
              'If all steps are complete, include a "completed": true field.',
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
        this.logger.info(`Progress: ${nowCompleted}/${this.currentPlan.length} steps completed`);
      }

      // Check if the plan is completed
      const allStepsDone = this.currentPlan.every((step) => step.done);
      this.taskCompleted = allStepsDone || Boolean(planData.completed);

      if (this.taskCompleted) {
        // Send plan finish event
        const finishEvent = this.getEventStream().createEvent(EventType.PLAN_FINISH, {
          sessionId,
          summary: 'All research steps completed, generating final report.',
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

    try {
      // Extract query keywords for image relevance
      const queryKeywords = this.originalQuery
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 3);

      // Find relevant images for the report
      const relevantImages = ContentProcessor.findRelevantImages(
        this.collectedImages,
        queryKeywords,
        5, // Maximum images in report
      );

      // Prepare the content for the LLM
      let contentStr = '用户的原始查询是：' + this.originalQuery + '\n\n';
      contentStr += '以下是我们收集到的所有信息：\n\n';

      relevantInfo.forEach((info, index) => {
        contentStr += `来源 ${index + 1}：${info.toolName}\n`;
        contentStr +=
          typeof info.content === 'string' ? info.content : JSON.stringify(info.content, null, 2);
        contentStr += '\n\n';
      });

      // Add image information
      if (relevantImages.length > 0) {
        contentStr += '\n收集到的相关图片：\n';
        relevantImages.forEach((img, index) => {
          contentStr += `图片 ${index + 1}: ${img.src}\n`;
          contentStr += `描述: ${img.caption || img.alt || '无描述'}\n\n`;
        });
      }

      // Ask LLM to design report structure based on available information
      const reportStructureResponse = await llmClient.chat.completions.create({
        model: resolvedModel.model,
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
            content: contentStr,
          },
        ],
      });

      // Parse report structure
      const structureContent =
        reportStructureResponse.choices[0]?.message?.content ||
        '{"title":"研究报告","sections":["概述","分析","结论"]}';
      let reportStructure;
      try {
        reportStructure = JSON.parse(structureContent);
      } catch (e) {
        this.logger.error(`Failed to parse report structure: ${e}`);
        reportStructure = {
          title: title || `研究报告：${this.originalQuery.substring(0, 50)}`,
          sections: ['概述', '分析', '结论'],
        };
      }

      // Generate the report content for each section in parallel
      const sectionPromises = reportStructure.sections.map(async (sectionTitle: string) => {
        const sectionPrompt =
          `你是一位专业的研究报告撰写者。基于提供的所有信息，撰写报告的"${sectionTitle}"章节。` +
          '章节内容应该基于收集的信息，深入、全面且有洞察力。' +
          '使用证据支持你的论点，适当引用信息来源。';

        return {
          title: sectionTitle,
          content: await ReportGenerator.generateSection(
            llmClient,
            resolvedModel.model,
            sectionPrompt,
            contentStr,
          ),
        };
      });

      const sections = await Promise.all(sectionPromises);

      // Assemble the final report
      const reportTitle =
        reportStructure.title || title || `研究报告：${this.originalQuery.substring(0, 50)}`;

      let finalReport = `# ${reportTitle}\n\n`;

      // Add sections
      sections.forEach((section) => {
        finalReport += `## ${section.title}\n\n${section.content}\n\n`;
      });

      // Add images if available
      if (relevantImages.length > 0) {
        finalReport += `## 相关图片\n\n`;
        finalReport += ContentProcessor.processImagesForMarkdown(relevantImages);
      }

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
}
