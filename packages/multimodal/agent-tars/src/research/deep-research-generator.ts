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
   * Enhanced to categorize and organize data more effectively
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
      .filter(
        (result) =>
          result.name?.includes('browser_get_markdown') ||
          result.name?.includes('browser_get_text') ||
          result.name?.includes('browser_get_html'),
      )
      .map((result) => result.content)
      .filter(Boolean);

    // Extract search results specifically
    const searchResults = toolResults
      .filter((result) => result.name?.includes('search'))
      .map((result) => result.content)
      .filter(Boolean);

    return {
      userMessages,
      toolResults,
      assistantMessages,
      environmentInputs,
      originalQuery,
      toolResultsByName,
      browserContent,
      searchResults,
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
              "You are an expert research report organizer. Based on the information provided, create a logical structure for a comprehensive research report. Follow EXACTLY what the user is asking for - do not invent topics that aren't covered in the data provided.",
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
        sections: ['Introduction', 'Key Findings', 'Conclusion'],
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
   * Enhanced to strictly follow user query and available data
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
            content: `You are an expert research analyst. Generate detailed content for the "${sectionTitle}" section of a research report. IMPORTANT: Only include information that is directly supported by the provided data - do NOT invent facts, statistics, or examples. If there is insufficient data for a comprehensive section, acknowledge the limitations and focus on what is available.`,
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
   * Enhanced to emphasize user query and factual accuracy
   */
  private createStructurePrompt(relevantData: any, options: ReportGenerationOptions): string {
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
    
    Return a JSON object with:
    1. "title": The report title (based on the original request)
    2. "sections": An array of section names that would create a comprehensive research report
    
    IMPORTANT: The sections should ONLY cover topics for which we have actual data. DO NOT include sections that would require inventing information.
    `;
  }

  /**
   * Create a prompt for generating section content
   * Enhanced to better match content to sections and ensure factual accuracy
   */
  private createSectionPrompt(
    sectionTitle: string,
    relevantData: any,
    options: ReportGenerationOptions,
  ): string {
    // Get the original user query to maintain focus
    const originalQuery = relevantData.originalQuery || 'Research request';

    // Extract relevant tool results based on multiple methods
    const sectionKeywords = this.getSectionKeywords(sectionTitle);

    // Match based on keywords
    const keywordMatches = relevantData.toolResults.filter((result: any) => {
      try {
        const resultContent =
          typeof result.content === 'string'
            ? result.content.toLowerCase()
            : JSON.stringify(result.content || {}).toLowerCase();

        return sectionKeywords.some((keyword) => resultContent.includes(keyword.toLowerCase()));
      } catch (e) {
        return false;
      }
    });

    // For introduction section, always include the original query and search results
    let relevantTools = keywordMatches;
    if (
      sectionTitle.toLowerCase().includes('introduction') ||
      sectionTitle.toLowerCase().includes('overview')
    ) {
      // Add search results for context in introduction
      const searchTools = relevantData.toolResults.filter((result: any) =>
        result.name?.includes('search'),
      );
      relevantTools = [...new Set([...relevantTools, ...searchTools])];
    }

    // For conclusion, include summary of findings across sections
    if (
      sectionTitle.toLowerCase().includes('conclusion') ||
      sectionTitle.toLowerCase().includes('summary')
    ) {
      // Include key browser content in conclusions
      const browserTools = relevantData.toolResults.filter((result: any) =>
        result.name?.includes('browser_get'),
      );
      relevantTools = [...new Set([...relevantTools, ...browserTools.slice(-2)])];
    }

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

    return `
    I'm writing a research report titled "${options.title}" based on the original request: "${originalQuery}"
    
    I need to generate content for the "${sectionTitle}" section of the report.
    
    Here is the relevant information from my research that specifically relates to this section:
    ${toolContext || 'Limited data available for this section.'}
    
    STRICT GUIDELINES:
    1. ONLY use information from the provided data - DO NOT invent facts, statistics, examples, or quotes
    2. If the data is insufficient, acknowledge the limitations and focus only on what is available
    3. Make sure all content directly addresses the original request
    4. Use proper Markdown formatting with headings, paragraphs, and lists as appropriate
    5. Write in a professional, analytical tone
    6. If there is insufficient data for this section, keep it brief and acknowledge the limitations
    
    Write the content for the "${sectionTitle}" section now, ensuring EVERYTHING is supported by the provided data.
    `;
  }

  /**
   * Get relevant keywords for a section based on its title
   * Enhanced with more comprehensive keyword mapping
   */
  private getSectionKeywords(sectionTitle: string): string[] {
    const title = sectionTitle.toLowerCase();

    // Expanded and refined keyword map for better content matching
    const keywordMap: Record<string, string[]> = {
      introduction: [
        'introduction',
        'overview',
        'background',
        'context',
        'purpose',
        'objective',
        'goal',
        'scope',
      ],
      background: [
        'history',
        'background',
        'context',
        'overview',
        'foundation',
        'basis',
        'origin',
        'development',
      ],
      methodology: [
        'method',
        'approach',
        'process',
        'procedure',
        'technique',
        'protocol',
        'framework',
        'system',
      ],
      data: [
        'data',
        'dataset',
        'information',
        'statistics',
        'numbers',
        'figures',
        'metrics',
        'measurements',
      ],
      results: [
        'result',
        'outcome',
        'finding',
        'discovery',
        'observation',
        'output',
        'consequence',
        'effect',
      ],
      findings: [
        'finding',
        'result',
        'discovery',
        'insight',
        'observation',
        'evidence',
        'indication',
        'revelation',
      ],
      analysis: [
        'analysis',
        'examination',
        'evaluation',
        'assessment',
        'study',
        'investigation',
        'interpretation',
        'review',
      ],
      discussion: [
        'discussion',
        'interpretation',
        'implication',
        'meaning',
        'significance',
        'importance',
        'relevance',
        'consequence',
      ],
      conclusion: [
        'conclusion',
        'summary',
        'ending',
        'final',
        'closing',
        'wrap-up',
        'summation',
        'overview',
      ],
      recommendations: [
        'recommendation',
        'suggestion',
        'advice',
        'proposal',
        'solution',
        'guidance',
        'direction',
        'instruction',
      ],
      limitations: [
        'limitation',
        'constraint',
        'restriction',
        'boundary',
        'shortcoming',
        'weakness',
        'drawback',
        'issue',
      ],
      future: [
        'future',
        'prospect',
        'outlook',
        'potential',
        'possibility',
        'opportunity',
        'next',
        'upcoming',
      ],
      comparison: [
        'comparison',
        'contrast',
        'difference',
        'similarity',
        'parallel',
        'analogy',
        'correlation',
        'relationship',
      ],
      impact: [
        'impact',
        'effect',
        'influence',
        'consequence',
        'result',
        'outcome',
        'significance',
        'importance',
      ],
      applications: [
        'application',
        'use',
        'usage',
        'implementation',
        'adoption',
        'deployment',
        'utilization',
        'practice',
      ],
      benefits: ['benefit', 'advantage', 'gain', 'profit', 'value', 'merit', 'plus', 'upside'],
      challenges: [
        'challenge',
        'problem',
        'issue',
        'difficulty',
        'obstacle',
        'hurdle',
        'barrier',
        'complication',
      ],
      trends: [
        'trend',
        'pattern',
        'tendency',
        'direction',
        'movement',
        'shift',
        'change',
        'evolution',
      ],
      overview: [
        'overview',
        'summary',
        'outline',
        'synopsis',
        'abstract',
        'brief',
        'digest',
        'recap',
      ],
      key: [
        'key',
        'main',
        'primary',
        'principal',
        'essential',
        'fundamental',
        'central',
        'critical',
      ],
    };

    // Try to find a direct match in the keyword map
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (title.includes(key)) {
        return keywords;
      }
    }

    // If no direct match, try to find partial matches
    for (const [key, keywords] of Object.entries(keywordMap)) {
      for (const keyword of keywords) {
        if (title.includes(keyword)) {
          return keywordMap[key] || [keyword];
        }
      }
    }

    // Default: use the section title words as keywords
    return sectionTitle.split(/\s+/);
  }
}
