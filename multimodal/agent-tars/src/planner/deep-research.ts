/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConsoleLogger,
  EventStream,
  EventType,
  ChatCompletionContentPart,
  ResolvedModel,
  OpenAI,
} from '@multimodal/mcp-agent';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

/**
 * Options for generating a research report
 */
interface ReportGenerationOptions {
  title: string;
  format?: 'detailed' | 'concise';
}

/**
 * DeepResearchGenerator - Handles the generation of detailed research reports
 *
 * This class implements a streamlined workflow for creating comprehensive
 * research reports from event stream data, using a multi-stage approach:
 * 1. Analyze and extract relevant information from the event stream
 * 2. Organize content into logical sections
 * 3. Generate detailed section content with streaming support
 * 4. Assemble and stream the final report in real-time
 */
export class DeepResearchGenerator {
  constructor(
    private logger: ConsoleLogger,
    private eventStream: EventStream,
  ) {
    this.logger = logger.spawn('DeepResearchGenerator');
  }

  /**
   * Generate a comprehensive research report
   *
   * @param llmClient - The LLM client to use for report generation
   * @param resolvedModel - The resolved model configuration
   * @param eventStream - The event stream to extract data from and send events to
   * @param options - Report generation options
   * @param abortSignal - Optional signal to abort LLM requests
   * @returns Success message
   */
  async generateReport(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    eventStream: EventStream,
    options: ReportGenerationOptions,
    abortSignal?: AbortSignal,
  ): Promise<any> {
    try {
      this.logger.info(`Generating research report: ${options.title}`);

      // Check if already aborted
      if (abortSignal?.aborted) {
        this.logger.info('Report generation aborted before starting');
        throw new Error('Report generation aborted');
      }

      // Create a unique message ID for tracking streaming events
      const messageId = `research-report-${uuidv4()}`;

      // Step 1: Extract relevant information from the event stream
      const relevantData = this.extractRelevantData(eventStream);

      // Check if there's enough information to generate a report
      if (!this.hasEnoughInformationForReport(relevantData)) {
        this.logger.warn('Insufficient information to generate a detailed report');

        // Create a simple answer instead of a full report
        const simpleAnswerEvent = eventStream.createEvent(EventType.FINAL_ANSWER, {
          content:
            "I don't have enough information to generate a detailed report on this topic. Please provide more context or try a different query.",
          isDeepResearch: false,
          title: options.title,
          messageId,
        });

        eventStream.sendEvent(simpleAnswerEvent);

        return {
          success: false,
          message: 'Insufficient information for report generation',
        };
      }

      // Step 2: Generate report structure
      const reportStructure = await this.generateReportStructure(
        llmClient,
        resolvedModel,
        relevantData,
        options,
        abortSignal,
      );
      console.log('reportStructure', reportStructure);

      // Step 3: Generate and stream the report
      await this.generateAndStreamReport(
        llmClient,
        resolvedModel,
        relevantData,
        reportStructure,
        messageId,
        options,
        abortSignal,
      );

      // Step 4: Send final complete event
      const finalEvent = eventStream.createEvent(EventType.FINAL_ANSWER, {
        content: reportStructure.fullContent || 'Research report generated successfully.',
        isDeepResearch: true,
        title: options.title,
        format: options.format,
        messageId,
      });

      eventStream.sendEvent(finalEvent);

      return {
        success: true,
        message: 'Research report generated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to generate research report: ${error}`);
      throw error;
    }
  }

  /**
   * Check if there's enough information to generate a meaningful report
   */
  private hasEnoughInformationForReport(relevantData: any): boolean {
    // Check for substantial content
    const hasSubstantialContent =
      (relevantData.browserContent && relevantData.browserContent.length > 0) ||
      (relevantData.searchResults && relevantData.searchResults.length > 0) ||
      (relevantData.environmentImages && relevantData.environmentImages.length > 0) ||
      (relevantData.environmentTexts &&
        relevantData.environmentTexts.some((text: string) => text && text.length > 200));

    this.logger.debug(
      `Information check: ${hasSubstantialContent ? 'Sufficient' : 'Insufficient'} data for report`,
    );

    return hasSubstantialContent;
  }

  /**
   * Extract relevant data from the event stream
   * Enhanced to handle multimodal content including images and text from environment inputs
   */
  private extractRelevantData(eventStream: EventStream): any {
    // Extract user messages, tool results, and other relevant information
    const events = eventStream.getEvents();

    // Process and extract information from each event type
    const userMessages = events.filter((e) => e.type === EventType.USER_MESSAGE);
    const toolResults = events.filter((e) => e.type === EventType.TOOL_RESULT);
    const assistantMessages = events.filter((e) => e.type === EventType.ASSISTANT_MESSAGE);
    const environmentInputs = events.filter((e) => e.type === EventType.ENVIRONMENT_INPUT);

    // Get original user query (first user message) for consistent reference
    const originalQuery = userMessages.length > 0 ? userMessages[0].content : '';

    // Group tool results by tool name for better organization
    const toolResultsByName: Record<string, any[]> = {};
    toolResults.forEach((result) => {
      const toolName = result.name || 'unknown';
      if (!toolResultsByName[toolName]) {
        toolResultsByName[toolName] = [];
      }
      toolResultsByName[toolName].push(result);
    });

    // Extract browser content specifically (often contains the most relevant information)
    const browserContent = toolResults
      .filter((result) => result.name?.includes('browser_get_markdown'))
      .map((result) => result.content)
      .filter(Boolean);

    // Extract search results specifically
    const searchResults = toolResults
      .filter((result) => result.name?.includes('search'))
      .map((result) => result.content)
      .filter(Boolean);

    // Extract environment inputs (images and text)
    const environmentImages: any[] = [];
    const environmentTexts: string[] = [];

    environmentInputs.forEach((input) => {
      if (Array.isArray(input.content)) {
        // Handle multimodal content arrays
        input.content.forEach((contentPart: any) => {
          if (contentPart.type === 'image_url' && contentPart.image_url?.url) {
            environmentImages.push(contentPart);
          } else if (contentPart.type === 'text' && contentPart.text) {
            environmentTexts.push(contentPart.text);
          }
        });
      } else if (typeof input.content === 'string') {
        // Handle pure text content
        environmentTexts.push(input.content);
      }
    });

    this.logger.info(
      `Extracted ${environmentImages.length} images and ${environmentTexts.length} text blocks from environment inputs`,
    );

    return {
      userMessages,
      toolResults,
      assistantMessages,
      environmentInputs,
      environmentImages,
      environmentTexts,
      originalQuery,
      toolResultsByName,
      browserContent,
      searchResults,
      allEvents: events,
    };
  }

  /**
   * Generate the structure for the research report
   * Updated to support multimodal content
   */
  private async generateReportStructure(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    relevantData: any,
    options: ReportGenerationOptions,
    abortSignal?: AbortSignal,
  ): Promise<any> {
    try {
      this.logger.info('Generating report structure');

      // Check if already aborted
      if (abortSignal?.aborted) {
        this.logger.info('Report structure generation aborted');
        throw new Error('Report structure generation aborted');
      }

      // Create multimodal prompt content with relevant data
      const structurePromptContent = this.createStructurePromptContent(relevantData, options);

      // Request structure from LLM using multimodal format
      const response = await llmClient.chat.completions.create(
        {
          model: resolvedModel.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                "You are an expert research report organizer. Based on the information provided, create a logical structure for a comprehensive research report. Follow EXACTLY what the user is asking for - do not invent topics that aren't covered in the data provided.",
            },
            {
              role: 'user',
              content: structurePromptContent,
            },
          ],
        },
        { signal: abortSignal },
      );

      // Parse the response
      const structureContent = response.choices[0]?.message?.content || '{}';
      const reportStructure = JSON.parse(structureContent);

      this.logger.info(
        `Generated report structure with ${reportStructure.sections?.length || 0} sections`,
      );

      return reportStructure;
    } catch (error) {
      this.logger.error(`Error generating report structure: ${error}`);
      // Return a default structure
      return {
        title: options.title,
        sections: ['Introduction', 'Key Findings', 'Conclusion'],
        fullContent: '',
      };
    }
  }

  /**
   * Create multimodal content array for report structure prompt
   */
  private createStructurePromptContent(
    relevantData: any,
    options: ReportGenerationOptions,
  ): ChatCompletionContentPart[] {
    const promptContent: ChatCompletionContentPart[] = [];

    // Add text instructions
    promptContent.push({
      type: 'text',
      text: this.createStructurePromptText(relevantData, options),
    });

    // Add a limited number of images if available (to avoid token limits)
    if (relevantData.environmentImages && relevantData.environmentImages.length > 0) {
      // Add up to 3 images for context
      const imagesToInclude = relevantData.environmentImages.slice(0, 3);

      this.logger.debug(`Including ${imagesToInclude.length} images in structure prompt`);

      for (const image of imagesToInclude) {
        promptContent.push({
          type: 'image_url',
          image_url: {
            url: image.image_url.url,
          },
        });
      }
    }

    return promptContent;
  }

  /**
   * Create text portion of the structure prompt
   */
  private createStructurePromptText(relevantData: any, options: ReportGenerationOptions): string {
    // Extract key information from relevant data
    const userQuery = relevantData.originalQuery || 'Research request';

    // Count tool results by type
    const toolCounts: Record<string, number> = {};
    relevantData.toolResults.forEach((result: any) => {
      const toolName = result.name || 'unknown';
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
    });

    // Format tool usage summary
    const toolSummary = Object.entries(toolCounts)
      .map(([tool, count]) => `${tool}: ${count} times`)
      .join('\n');

    // Add sample data from key sources to help with structure
    let dataPreview = '';

    // Add browser content samples
    if (relevantData.browserContent && relevantData.browserContent.length > 0) {
      const samples = relevantData.browserContent.slice(0, 3).map((content: any) => {
        if (typeof content === 'string') {
          return content.substring(0, 300) + (content.length > 300 ? '...' : '');
        } else {
          return JSON.stringify(content).substring(0, 300) + '...';
        }
      });
      dataPreview += `\nWebpage content samples:\n${samples.join('\n\n')}\n`;
    }

    // Add search result samples
    if (relevantData.searchResults && relevantData.searchResults.length > 0) {
      dataPreview += `\nSearch result samples:\n`;
      let searchSample = '';
      try {
        const firstSearchResult = relevantData.searchResults[0];
        if (Array.isArray(firstSearchResult)) {
          searchSample = firstSearchResult
            .slice(0, 3)
            .map(
              (item: any) =>
                `- ${item.title || 'Untitled'}: ${(item.snippet || '').substring(0, 100)}...`,
            )
            .join('\n');
        } else if (typeof firstSearchResult === 'object') {
          searchSample = JSON.stringify(firstSearchResult).substring(0, 300) + '...';
        } else {
          searchSample = String(firstSearchResult).substring(0, 300) + '...';
        }
      } catch (e) {
        searchSample = 'Error parsing search results';
      }
      dataPreview += searchSample + '\n';
    }

    // Add environment text content
    if (relevantData.environmentTexts && relevantData.environmentTexts.length > 0) {
      dataPreview += `\nEnvironment content samples:\n`;
      const textSamples = relevantData.environmentTexts
        .slice(0, 3)
        .map((text: string) => text.substring(0, 300) + (text.length > 300 ? '...' : ''))
        .join('\n\n');
      dataPreview += textSamples + '\n';
    }

    // Add reference to images if present
    if (relevantData.environmentImages && relevantData.environmentImages.length > 0) {
      dataPreview += `\nAdditional context: ${relevantData.environmentImages.length} screenshot images have been included for visual reference.\n`;
    }

    return `
    I need to create a factual research report with the title: "${options.title}" that STRICTLY answers the original request.
    
    The original research request was:
    "${userQuery}"
    
    During my research, I used these tools:
    ${toolSummary}
    
    Here are samples of the data I've collected:
    ${dataPreview}
    
    Please create a structured outline for a ${options.format || 'detailed'} research report that:
    1. DIRECTLY addresses the original request
    2. ONLY includes sections that can be supported by the collected data
    3. Does NOT include sections for which we lack sufficient information
    4. Follows a logical flow from introduction to conclusion
    5. Considers both textual content AND any screenshots/images provided
    
    Return a JSON object with:
    1. "title": The report title (based on the original request)
    2. "sections": An array of section names that would create a comprehensive research report
    
    IMPORTANT: The sections should ONLY cover topics for which we have actual data. DO NOT include sections that would require inventing information.
    `;
  }

  /**
   * Generate and stream the research report section by section
   * Modified to support real-time streaming of content
   */
  private async generateAndStreamReport(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    relevantData: any,
    reportStructure: any,
    messageId: string,
    options: ReportGenerationOptions,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    this.logger.info('Generating and streaming report');

    // Check if already aborted
    if (abortSignal?.aborted) {
      this.logger.info('Report streaming aborted before starting');
      throw new Error('Report streaming aborted');
    }

    let fullReport = `# ${reportStructure.title || options.title}\n\n`;

    // Add original user query as a reference point
    if (relevantData.originalQuery) {
      const querySection = `> Original question: ${relevantData.originalQuery}\n\n`;
      fullReport += querySection;
      this.streamReportChunk(querySection, messageId, false);
    }

    // Generate table of contents
    const toc = this.generateTableOfContents(reportStructure.sections);
    fullReport += toc;
    this.streamReportChunk(toc, messageId, false);

    // Generate each section with streaming
    for (const section of reportStructure.sections) {
      const sectionTitle = `\n\n## ${section}\n\n`;
      fullReport += sectionTitle;
      this.streamReportChunk(sectionTitle, messageId, false);

      // Stream generate section content
      const sectionContent = await this.streamSectionContent(
        llmClient,
        resolvedModel,
        section,
        relevantData,
        options,
        messageId,
        fullReport,
        abortSignal,
      );

      // 将章节内容添加到完整报告中
      fullReport += sectionContent;

      // Add section separator
      const separator = '\n\n';
      fullReport += separator;
      this.streamReportChunk(separator, messageId, false);
    }

    // Store the full content in the report structure
    reportStructure.fullContent = fullReport;
  }

  /**
   * Stream section content using LLM streaming capabilities
   * Enhanced to support multimodal content
   */
  private async streamSectionContent(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    sectionTitle: string,
    relevantData: any,
    options: ReportGenerationOptions,
    messageId: string,
    fullReport: string,
    abortSignal?: AbortSignal,
  ): Promise<string | undefined> {
    try {
      this.logger.info(`Streaming section content: ${sectionTitle}`);

      // Prepare section-specific multimodal prompt
      const sectionPromptContent = this.createSectionPromptContent(
        sectionTitle,
        relevantData,
        options,
      );

      fs.writeFileSync(
        `${sectionPromptContent}-${Date.now()}.json`,
        JSON.stringify(sectionPromptContent, null, 2),
        'utf-8',
      );

      // Create streaming request
      const stream = await llmClient.chat.completions.create(
        {
          model: resolvedModel.model,
          stream: true, // Enable streaming
          messages: [
            {
              role: 'system',
              content: `You are an expert research analyst. Generate detailed content for the "${sectionTitle}" section of a research report. IMPORTANT: Only include information that is directly supported by the provided data - do NOT invent facts, statistics, or examples. If there is insufficient data for a comprehensive section, acknowledge the limitations and focus on what is available.`,
            },
            {
              role: 'user',
              content: sectionPromptContent,
            },
          ],
        },
        { signal: abortSignal },
      );

      // 创建一个变量来收集完整的章节内容
      let sectionContent = '';

      // Process the stream chunks in real-time
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // 累加到章节内容
          sectionContent += content;
          // 发送每个块到客户端
          this.streamReportChunk(content, messageId, false);
        }
      }

      return sectionContent;
    } catch (error) {
      this.logger.error(`Error streaming section ${sectionTitle}: ${error}`);
      // Send error message as fallback
      const errorMessage = `\n\n*Error generating content for ${sectionTitle}: ${error}*\n\n`;
      this.streamReportChunk(errorMessage, messageId, false);
    }
  }

  /**
   * Create multimodal content array for section-specific prompts
   * Includes relevant images and text content for the specific section
   */
  private createSectionPromptContent(
    sectionTitle: string,
    relevantData: any,
    options: ReportGenerationOptions,
  ): ChatCompletionContentPart[] {
    const promptContent: ChatCompletionContentPart[] = [];

    // Add primary text instructions
    promptContent.push({
      type: 'text',
      text: this.createSectionPromptText(sectionTitle, relevantData, options),
    });

    // Include images if available
    if (relevantData.environmentImages && relevantData.environmentImages.length > 0) {
      // Add up to 2 images for context (to avoid token limits)
      const imagesToInclude = relevantData.environmentImages.slice(0, 2);

      for (const image of imagesToInclude) {
        promptContent.push({
          type: 'image_url',
          image_url: {
            url: image.image_url.url,
          },
        });
      }

      this.logger.debug(
        `Including ${imagesToInclude.length} images in "${sectionTitle}" section prompt`,
      );
    }

    return promptContent;
  }

  /**
   * Stream a chunk of the report to the event stream
   */
  private streamReportChunk(content: string, messageId: string, isComplete: boolean): void {
    const streamingEvent = this.eventStream.createEvent(EventType.FINAL_ANSWER_STREAMING, {
      content,
      isDeepResearch: true,
      isComplete,
      messageId,
    });

    this.eventStream.sendEvent(streamingEvent);
  }

  /**
   * Generate the table of contents for the report
   */
  private generateTableOfContents(sections: string[]): string {
    let toc = '## Table of Contents\n\n';

    sections.forEach((section, index) => {
      toc += `${index + 1}. [${section}](#${section.toLowerCase().replace(/\s+/g, '-')})\n`;
    });

    toc += '\n\n';
    return toc;
  }

  /**
   * Create text for section-specific prompts
   */
  private createSectionPromptText(
    sectionTitle: string,
    relevantData: any,
    options: ReportGenerationOptions,
  ): string {
    // Get the original user query to maintain focus
    const originalQuery = relevantData.originalQuery || 'Research request';

    // Extract relevant tool results without section-specific keyword matching
    const relevantTools = relevantData.toolResults;

    // Format tool results as context
    const toolContext = relevantTools
      .map((tool: any) => {
        let content = '';
        try {
          content = typeof tool.content === 'string' ? tool.content : JSON.stringify(tool.content);
        } catch (e) {
          content = 'Error formatting content';
        }

        return `Tool: ${tool.name || 'unknown'}\nContent: ${content.substring(0, 800)}${
          content.length > 800 ? '...' : ''
        }`;
      })
      .join('\n\n');

    // Include environment text content
    let environmentContext = '';
    if (relevantData.environmentTexts && relevantData.environmentTexts.length > 0) {
      const textSamples = relevantData.environmentTexts
        .slice(0, 2)
        .map((text: string) => text.substring(0, 800) + (text.length > 800 ? '...' : ''))
        .join('\n\n');
      environmentContext = `\nEnvironment Content:\n${textSamples}\n`;
    }

    // Add image reference if images are included
    const imageReference =
      relevantData.environmentImages && relevantData.environmentImages.length > 0
        ? "\n\nNOTE: Screenshots have been provided. Analyze any visual information that's relevant to this section."
        : '';

    return `
    I'm writing a research report titled "${options.title}" based on the original request: "${originalQuery}"
    
    I need to generate content for the "${sectionTitle}" section of the report.
    
    Here is the relevant information from my research that specifically relates to this section:
    ${toolContext || 'Limited data available for this section.'}
    ${environmentContext}
    ${imageReference}
    
    STRICT GUIDELINES:
    1. ONLY use information from the provided data - DO NOT invent facts, statistics, examples, or quotes
    2. If the data is insufficient, acknowledge the limitations and focus only on what is available
    3. Make sure all content directly addresses the original request
    4. Use proper Markdown formatting with headings, paragraphs, and lists as appropriate
    5. Write in a professional, analytical tone
    6. If there is insufficient data for this section, keep it brief and acknowledge the limitations
    7. Reference visual information from screenshots when relevant to this section
    
    Write the content for the "${sectionTitle}" section now, ensuring EVERYTHING is supported by the provided data.
    `;
  }
}
