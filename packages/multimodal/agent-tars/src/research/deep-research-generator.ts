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
 * This class implements a streamlined workflow for creating research reports
 * based directly on user requirements, with a simplified structure focused on
 * the specific information needed.
 */
export class DeepResearchGenerator {
  constructor(
    private logger: ConsoleLogger,
    private eventStream: EventStream,
  ) {
    this.logger = logger.spawn('DeepResearchGenerator');
  }

  /**
   * Generate a research report with TOC directly based on user requirements
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

      // Step 2: Generate user-focused report structure
      const reportStructure = await this.generateUserFocusedStructure(
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
   * Generate a user-focused structure based directly on the user's requirements
   */
  private async generateUserFocusedStructure(
    llmClient: OpenAI,
    resolvedModel: ResolvedModel,
    relevantData: any,
    options: ReportGenerationOptions,
  ): Promise<any> {
    try {
      this.logger.info('Generating user-focused report structure');

      // Extract user query from the first user message
      const userQuery = relevantData.userMessages[0]?.content || '';

      // Prepare a prompt focused on extracting exactly what the user needs
      const structurePrompt = `
I need to create a focused information report based on the user's request:
"${userQuery}"

The report should have a simple, focused structure that directly addresses ONLY what the user is asking for.
Please create a minimal Table of Contents with 2-5 sections that precisely matches what information the user is seeking.

Some guidelines:
1. Focus ONLY on the specific information the user requested
2. Don't add sections for background or methodology unless explicitly requested
3. Keep the structure simple and directly useful to the user
4. Use the user's own terminology where possible
5. Don't create generic report sections - be specific to this particular query

Return a JSON object with:
1. "title": A clear title that reflects exactly what the user is looking for
2. "sections": An array of 2-5 specific section names that directly address the user's information needs
`;

      // Request structure from LLM
      const response = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a focused information retrieval specialist. Create minimal, targeted report structures that address exactly what users need - nothing more, nothing less.',
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
        `Generated user-focused report structure with ${reportStructure.sections?.length || 0} sections`,
      );

      return reportStructure;
    } catch (error) {
      this.logger.error(`Error generating report structure: ${error}`);
      // Return a minimal default structure
      return {
        title: options.title,
        sections: ['Information Summary', 'Details', 'Conclusion'],
        fullContent: '',
      };
    }
  }

  /**
   * Generate and stream the research report section by section
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

      // Create a focused prompt specifically for this section
      const sectionPrompt = `
You are writing a focused section for "${sectionTitle}" in a report titled "${options.title}".

The user's original request was:
"${relevantData.userMessages[0]?.content || 'Information request'}"

Please write ONLY the specific information that belongs in this section.
Be concise, factual, and directly address what the user needs to know.
Focus on presenting the information clearly without unnecessary elaboration.
Use appropriate formatting with headings and paragraphs as needed.

Format the content using Markdown.
`;

      // Create streaming request
      const stream = await llmClient.chat.completions.create({
        model: resolvedModel.model,
        stream: true, // Enable streaming
        messages: [
          {
            role: 'system',
            content:
              'You are a focused information provider. Present only relevant facts directly related to the section topic.',
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
