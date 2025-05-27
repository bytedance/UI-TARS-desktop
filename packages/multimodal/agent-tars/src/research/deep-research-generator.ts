/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ConsoleLogger,
  EventStream,
  EventType,
  ChatCompletionContentPart,
  ResolvedModel,
} from '@multimodal/mcp-agent';
import { OpenAI } from 'openai';
import { v4 as uuidv4 } from 'uuid';

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
   * @returns Success message
   */
  async generateReport(
    llmClient: OpenAI,
    resolvedModel: any,
    eventStream: EventStream,
    options: ReportGenerationOptions,
  ): Promise<any> {
    try {
      this.logger.info(`Generating research report: ${options.title}`);

      // Create a unique message ID for tracking streaming events
      const messageId = `research-report-${uuidv4()}`;

      // Step 1: Extract relevant information from the event stream
      const relevantData = this.extractRelevantData(eventStream);

      // Step 2: Generate report structure
      const reportStructure = await this.generateReportStructure(
        llmClient,
        resolvedModel,
        relevantData,
        options,
      );

      // Step 3: Generate and stream the report
      await this.generateAndStreamReport(
        llmClient,
        resolvedModel,
        relevantData,
        reportStructure,
        messageId,
        options,
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
   * Extract relevant data from the event stream
   */
  private extractRelevantData(eventStream: EventStream): any {
    // Extract user messages, tool results, and other relevant information
    const events = eventStream.getEvents();

    // Process and extract information from each event type
    const userMessages = events.filter((e) => e.type === EventType.USER_MESSAGE);
    const toolResults = events.filter((e) => e.type === EventType.TOOL_RESULT);
    const assistantMessages = events.filter((e) => e.type === EventType.ASSISTANT_MESSAGE);

    return {
      userMessages,
      toolResults,
      assistantMessages,
      allEvents: events,
    };
  }

  /**
   * Generate the structure for the research report
   */
  private async generateReportStructure(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    relevantData: any,
    options: ReportGenerationOptions,
  ): Promise<any> {
    try {
      this.logger.info('Generating report structure');

      // Prepare prompt with relevant data for structure generation
      const structurePrompt = this.createStructurePrompt(relevantData, options);

      // Request structure from LLM
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an expert research report organizer. Based on the information provided, create a logical structure for a comprehensive research report.',
          },
          {
            role: 'user',
            content: structurePrompt,
          },
        ],
      });

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
        sections: ['Introduction', 'Key Findings', 'Analysis', 'Conclusion'],
        fullContent: '',
      };
    }
  }

  /**
   * Generate and stream the research report section by section
   * Modified to support real-time streaming of content
   */
  private async generateAndStreamReport(
    llmClient: OpenAI,
    resolvedModel: any,
    relevantData: any,
    reportStructure: any,
    messageId: string,
    options: ReportGenerationOptions,
  ): Promise<void> {
    this.logger.info('Generating and streaming report');

    let fullReport = `# ${reportStructure.title || options.title}\n\n`;

    // Stream initial report header
    this.streamReportChunk(fullReport, messageId, false);

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
      await this.streamSectionContent(
        llmClient,
        resolvedModel,
        section,
        relevantData,
        options,
        messageId,
        fullReport,
      );

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
   * This is a new method to support streaming content generation
   */
  private async streamSectionContent(
    llmClient: OpenAI,
    resolvedModel: any,
    sectionTitle: string,
    relevantData: any,
    options: ReportGenerationOptions,
    messageId: string,
    fullReport: string,
  ): Promise<void> {
    try {
      this.logger.info(`Streaming section content: ${sectionTitle}`);

      // Prepare section-specific prompt
      const sectionPrompt = this.createSectionPrompt(sectionTitle, relevantData, options);

      // Create streaming request
      const stream = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        stream: true, // Enable streaming
        messages: [
          {
            role: 'system',
            content: `You are an expert research analyst. Generate detailed content for the "${sectionTitle}" section of a research report.`,
          },
          {
            role: 'user',
            content: sectionPrompt,
          },
        ],
      });

      // Process the stream chunks in real-time
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // Send each chunk to the client as it arrives
          this.streamReportChunk(content, messageId, false);
        }
      }
    } catch (error) {
      this.logger.error(`Error streaming section ${sectionTitle}: ${error}`);
      // Send error message as fallback
      const errorMessage = `\n\n*Error generating content for ${sectionTitle}: ${error}*\n\n`;
      this.streamReportChunk(errorMessage, messageId, false);
    }
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
   * Create a prompt for generating the report structure
   */
  private createStructurePrompt(relevantData: any, options: ReportGenerationOptions): string {
    // Extract key information from relevant data
    const userQuery = relevantData.userMessages[0]?.content || 'Research request';

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

    return `
    I need to create a detailed research report with the title: "${options.title}".
    
    The original research request was:
    "${userQuery}"
    
    During my research, I used these tools:
    ${toolSummary}
    
    Please create a structured outline for a ${options.format || 'detailed'} research report.
    Return a JSON object with:
    1. "title": The report title
    2. "sections": An array of section names that would create a comprehensive research report
    
    The sections should follow a logical flow and cover all important aspects of the research topic.
    `;
  }

  /**
   * Create a prompt for generating section content
   */
  private createSectionPrompt(
    sectionTitle: string,
    relevantData: any,
    options: ReportGenerationOptions,
  ): string {
    // Extract relevant tool results based on section title
    // This is a simple keyword matching approach
    const sectionKeywords = this.getSectionKeywords(sectionTitle);

    const relevantTools = relevantData.toolResults.filter((result: any) => {
      const resultContent = JSON.stringify(result.content).toLowerCase();
      return sectionKeywords.some((keyword) => resultContent.includes(keyword.toLowerCase()));
    });

    // Format tool results as context
    const toolContext = relevantTools
      .map((tool: any) => {
        const content =
          typeof tool.content === 'string' ? tool.content : JSON.stringify(tool.content);
        return `Tool: ${tool.name}\nContent: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`;
      })
      .join('\n\n');

    return `
    I'm writing a research report titled "${options.title}" and need to generate content for the "${sectionTitle}" section.
    
    Here is relevant information from my research:
    ${toolContext || 'No specific tool data available for this section.'}
    
    Please write a comprehensive "${sectionTitle}" section for the report that:
    - Provides in-depth analysis relevant to this section topic
    - Includes specific facts, figures, and examples from the research
    - Maintains a professional, analytical tone
    - Uses proper formatting with headings, paragraphs, and lists as appropriate
    - Is detailed and informative (aim for approximately 300-500 words)
    
    Format the content using Markdown.
    `;
  }

  /**
   * Get relevant keywords for a section based on its title
   */
  private getSectionKeywords(sectionTitle: string): string[] {
    const title = sectionTitle.toLowerCase();

    // Map section titles to relevant keywords
    const keywordMap: Record<string, string[]> = {
      introduction: ['background', 'overview', 'introduction', 'context'],
      background: ['history', 'background', 'context', 'overview'],
      methodology: ['method', 'approach', 'process', 'procedure'],
      findings: ['result', 'finding', 'discover', 'data'],
      analysis: ['analysis', 'examine', 'evaluate', 'assess'],
      discussion: ['discuss', 'implication', 'meaning', 'significance'],
      conclusion: ['conclusion', 'summary', 'final', 'recommend'],
      recommendation: ['recommend', 'suggest', 'advice', 'propose'],
      limitation: ['limitation', 'constraint', 'challenge', 'obstacle'],
      future: ['future', 'prospect', 'potential', 'next'],
    };

    // Find matching keywords or use the section title itself
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (title.includes(key)) {
        return keywords;
      }
    }

    // Default: use the section title words as keywords
    return sectionTitle.split(/\s+/);
  }
}
