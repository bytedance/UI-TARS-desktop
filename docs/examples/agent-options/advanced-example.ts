/**
 * Advanced Agent Options Example
 *
 * This example demonstrates complex agent options configuration
 * for a multi-modal AI assistant with extensive customization.
 */

import { AgentServerOptions, AgentSession } from '@tarko/interface';

// Advanced Agent Options Configuration
const advancedServerOptions: AgentServerOptions = {
  port: 3000,
  agentOptions: {
    type: 'object',
    properties: {
      // === UI Behavior Options ===
      showThinkingProcess: {
        type: 'boolean',
        title: 'Show Thinking Process',
        description: 'Display step-by-step reasoning in responses',
        default: true,
      },

      showProgressIndicators: {
        type: 'boolean',
        title: 'Show Progress',
        description: 'Display progress bars for long operations',
        default: true,
      },

      // === Agent Personality ===
      personalityMode: {
        type: 'string',
        title: 'Personality',
        description: 'How the agent communicates and behaves',
        enum: ['professional', 'friendly', 'technical', 'creative'],
        default: 'friendly',
      },

      communicationStyle: {
        type: 'string',
        title: 'Communication Style',
        description: 'Tone and approach for responses',
        enum: ['concise', 'detailed', 'explanatory'],
        default: 'detailed',
      },

      // === Tool and Feature Controls ===
      enableWebSearch: {
        type: 'boolean',
        title: 'Web Search',
        description:
          'Allow agent to search the internet for current information',
        default: false,
      },

      enableCodeGeneration: {
        type: 'boolean',
        title: 'Code Generation',
        description: 'Enable automatic code generation and execution',
        default: true,
      },

      enableImageAnalysis: {
        type: 'boolean',
        title: 'Image Analysis',
        description: 'Analyze and describe uploaded images',
        default: true,
      },

      // === Output Format Options ===
      preferredCodeLanguage: {
        type: 'string',
        title: 'Code Language',
        description: 'Default programming language for code examples',
        enum: ['typescript', 'javascript', 'python', 'go', 'rust'],
        default: 'typescript',
      },

      outputFormat: {
        type: 'string',
        title: 'Output Format',
        description: 'How to structure responses',
        enum: ['markdown', 'html', 'plain'],
        default: 'markdown',
      },

      includeSourceReferences: {
        type: 'boolean',
        title: 'Source References',
        description: 'Include citations and references in responses',
        default: true,
      },

      // === Performance and Limits ===
      maxReasoningSteps: {
        type: 'string',
        title: 'Max Reasoning Steps',
        description: 'Maximum number of reasoning steps for complex problems',
        enum: ['5', '10', '20', 'unlimited'],
        default: '10',
      },

      responseTimePreference: {
        type: 'string',
        title: 'Response Speed',
        description: 'Balance between response speed and quality',
        enum: ['fast', 'balanced', 'thorough'],
        default: 'balanced',
      },

      // === Content Filtering ===
      contentSafetyLevel: {
        type: 'string',
        title: 'Content Safety',
        description: 'Level of content filtering and safety checks',
        enum: ['strict', 'moderate', 'permissive'],
        default: 'moderate',
      },

      // === Experimental Features ===
      enableExperimentalFeatures: {
        type: 'boolean',
        title: 'Experimental Features',
        description: 'Enable bleeding-edge features (may be unstable)',
        default: false,
      },
    },
  },
};

// Advanced Agent Implementation
class AdvancedMultiModalAgent {
  async processMessage(
    session: AgentSession,
    message: string,
  ): Promise<string> {
    const options = session.metadata?.agentOptions || {};

    // Initialize response builder
    const responseBuilder = new ResponseBuilder(options);

    try {
      // Show thinking process if enabled
      if (options.showThinkingProcess) {
        responseBuilder.addThinking(
          'Analyzing your request and determining the best approach...',
        );
      }

      // Analyze the message
      const analysis = await this.analyzeMessage(message, options);

      // Generate response based on analysis and options
      const response = await this.generateResponse(
        analysis,
        options,
        responseBuilder,
      );

      // Apply formatting based on output format preference
      return this.formatResponse(response, options);
    } catch (error) {
      return this.handleError(error, options, responseBuilder);
    }
  }

  private async analyzeMessage(message: string, options: any) {
    const analysis = {
      intent: 'general',
      complexity: 'medium',
      requiresWebSearch: false,
      requiresCodeGeneration: false,
      requiresImageAnalysis: false,
      language: 'english',
    };

    // Determine if web search is needed and allowed
    if (this.needsWebSearch(message) && options.enableWebSearch) {
      analysis.requiresWebSearch = true;
    }

    // Check if code generation is needed and allowed
    if (this.needsCodeGeneration(message) && options.enableCodeGeneration) {
      analysis.requiresCodeGeneration = true;
    }

    // Check for image analysis needs
    if (this.hasImageContent(message) && options.enableImageAnalysis) {
      analysis.requiresImageAnalysis = true;
    }

    return analysis;
  }

  private async generateResponse(
    analysis: any,
    options: any,
    builder: ResponseBuilder,
  ): Promise<string> {
    let response = '';

    // Apply personality and communication style
    const personality = options.personalityMode || 'friendly';
    const style = options.communicationStyle || 'detailed';

    // Generate greeting based on personality
    response += this.generateGreeting(personality, style);

    // Handle web search if needed
    if (analysis.requiresWebSearch) {
      if (options.showProgressIndicators) {
        builder.addProgress('Searching the web for current information...');
      }
      const searchResults = await this.performWebSearch(analysis, options);
      response += this.formatSearchResults(searchResults, options);
    }

    // Handle code generation if needed
    if (analysis.requiresCodeGeneration) {
      if (options.showProgressIndicators) {
        builder.addProgress('Generating code solution...');
      }
      const code = await this.generateCode(analysis, options);
      response += this.formatCode(code, options);
    }

    // Handle image analysis if needed
    if (analysis.requiresImageAnalysis) {
      if (options.showProgressIndicators) {
        builder.addProgress('Analyzing uploaded images...');
      }
      const imageAnalysis = await this.analyzeImages(analysis, options);
      response += this.formatImageAnalysis(imageAnalysis, options);
    }

    // Apply reasoning steps limit
    const maxSteps = this.parseMaxSteps(options.maxReasoningSteps);
    if (maxSteps > 0) {
      response = this.limitReasoningSteps(response, maxSteps);
    }

    // Add source references if enabled
    if (options.includeSourceReferences) {
      response += this.addSourceReferences(analysis);
    }

    return response;
  }

  private generateGreeting(personality: string, style: string): string {
    const greetings = {
      professional: {
        concise: "I'll assist you with that.",
        detailed:
          "I'm here to provide professional assistance with your request.",
        explanatory:
          "I'll help you with this request and explain my approach step by step.",
      },
      friendly: {
        concise: 'Happy to help!',
        detailed: "I'd be delighted to help you with this!",
        explanatory:
          "I'm excited to help you with this - let me walk you through my thinking!",
      },
      technical: {
        concise: 'Processing request.',
        detailed:
          'Analyzing your technical requirements and preparing a solution.',
        explanatory:
          "I'll break down this technical problem and provide a comprehensive solution.",
      },
      creative: {
        concise: "Let's create something amazing!",
        detailed:
          'What an interesting challenge! Let me explore some creative approaches.',
        explanatory:
          'This is fascinating! Let me share my creative process as I work through this.',
      },
    };

    return greetings[personality]?.[style] || greetings.friendly.detailed;
  }

  private formatResponse(response: string, options: any): string {
    const format = options.outputFormat || 'markdown';

    switch (format) {
      case 'html':
        return this.convertToHtml(response);
      case 'plain':
        return this.stripFormatting(response);
      case 'markdown':
      default:
        return response;
    }
  }

  private handleError(
    error: Error,
    options: any,
    builder: ResponseBuilder,
  ): string {
    const personality = options.personalityMode || 'friendly';

    const errorMessages = {
      professional:
        'I apologize, but I encountered an issue processing your request.',
      friendly:
        "Oops! Something went wrong, but I'm here to help figure it out.",
      technical:
        'Error encountered during processing. Debugging information available.',
      creative:
        "Well, that's unexpected! Let's turn this challenge into an opportunity.",
    };

    let response = errorMessages[personality] || errorMessages.friendly;

    if (options.enableExperimentalFeatures) {
      response += `\n\nDebug info: ${error.message}`;
    }

    return response;
  }

  // Helper methods (simplified for example)
  private needsWebSearch(message: string): boolean {
    const webSearchKeywords = [
      'current',
      'latest',
      'recent',
      'news',
      'today',
      'now',
    ];
    return webSearchKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );
  }

  private needsCodeGeneration(message: string): boolean {
    const codeKeywords = [
      'code',
      'function',
      'algorithm',
      'implement',
      'program',
    ];
    return codeKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );
  }

  private hasImageContent(message: string): boolean {
    // In real implementation, check for actual image attachments
    return (
      message.toLowerCase().includes('image') ||
      message.toLowerCase().includes('picture')
    );
  }

  private parseMaxSteps(maxSteps: string): number {
    if (maxSteps === 'unlimited') return -1;
    return parseInt(maxSteps) || 10;
  }

  // Placeholder methods for complex operations
  private async performWebSearch(analysis: any, options: any): Promise<string> {
    return 'Web search results would appear here...';
  }

  private async generateCode(analysis: any, options: any): Promise<string> {
    const language = options.preferredCodeLanguage || 'typescript';
    return `// ${language} code would be generated here\nconsole.log('Hello, World!');`;
  }

  private async analyzeImages(analysis: any, options: any): Promise<string> {
    return 'Image analysis results would appear here...';
  }

  private formatSearchResults(results: string, options: any): string {
    return `\n\n📊 **Web Search Results:**\n${results}\n`;
  }

  private formatCode(code: string, options: any): string {
    const language = options.preferredCodeLanguage || 'typescript';
    return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  }

  private formatImageAnalysis(analysis: string, options: any): string {
    return `\n\n🖼️ **Image Analysis:**\n${analysis}\n`;
  }

  private addSourceReferences(analysis: any): string {
    return '\n\n📚 **Sources:** Documentation, web search results, and knowledge base.';
  }

  private limitReasoningSteps(response: string, maxSteps: number): string {
    // Simplified implementation
    return response;
  }

  private convertToHtml(response: string): string {
    // Convert markdown to HTML
    return response.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  private stripFormatting(response: string): string {
    // Remove markdown formatting
    return response.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n\n/g, '\n');
  }
}

// Response Builder Helper Class
class ResponseBuilder {
  private response: string = '';
  private options: any;

  constructor(options: any) {
    this.options = options;
  }

  addThinking(thought: string): void {
    if (this.options.showThinkingProcess) {
      this.response += `🤔 **Thinking:** ${thought}\n\n`;
    }
  }

  addProgress(status: string): void {
    if (this.options.showProgressIndicators) {
      this.response += `⏳ **Progress:** ${status}\n\n`;
    }
  }

  getResponse(): string {
    return this.response;
  }
}

export { advancedServerOptions, AdvancedMultiModalAgent };
