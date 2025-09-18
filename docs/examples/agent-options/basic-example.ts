/**
 * Basic Agent Options Example
 *
 * This example shows how to configure basic agent options
 * for a simple chatbot with customizable behavior.
 */

import { AgentServerOptions, AgentSession } from '@tarko/interface';

// 1. Define Agent Options Schema
const serverOptions: AgentServerOptions = {
  port: 3000,
  agentOptions: {
    type: 'object',
    properties: {
      // Boolean option - Toggle switch
      verboseMode: {
        type: 'boolean',
        title: 'Verbose Mode',
        description: 'Provide detailed explanations in responses',
        default: false,
      },

      // Binary enum - Toggle buttons
      responseStyle: {
        type: 'string',
        title: 'Response Style',
        description: 'Choose how the agent responds',
        enum: ['casual', 'formal'],
        default: 'casual',
      },

      // Multi enum - Dropdown
      language: {
        type: 'string',
        title: 'Response Language',
        description: 'Language for agent responses',
        enum: ['english', 'chinese', 'japanese'],
        default: 'english',
      },
    },
  },
};

// 2. Use Options in Your Agent
class BasicChatAgent {
  async processMessage(
    session: AgentSession,
    message: string,
  ): Promise<string> {
    // Get current options from session metadata
    const options = session.metadata?.agentOptions || {};

    const isVerbose = options.verboseMode || false;
    const style = options.responseStyle || 'casual';
    const language = options.language || 'english';

    // Generate response based on options
    let response = '';

    // Add verbose prefix if enabled
    if (isVerbose) {
      response += this.getVerbosePrefix(language);
    }

    // Generate main response
    const mainResponse = await this.generateResponse(message, style, language);
    response += mainResponse;

    // Add verbose suffix if enabled
    if (isVerbose) {
      response += this.getVerboseSuffix(language);
    }

    return response;
  }

  private getVerbosePrefix(language: string): string {
    const prefixes = {
      english: '🤔 **Analysis**: Let me think about your question...\n\n',
      chinese: '🤔 **分析**: 让我思考一下您的问题...\n\n',
      japanese: '🤔 **分析**: あなたの質問について考えてみます...\n\n',
    };
    return prefixes[language] || prefixes.english;
  }

  private getVerboseSuffix(language: string): string {
    const suffixes = {
      english:
        '\n\n💡 **Note**: This response was generated with verbose mode enabled.',
      chinese: '\n\n💡 **注意**: 此回复是在详细模式下生成的。',
      japanese: '\n\n💡 **注意**: この回答は詳細モードで生成されました。',
    };
    return suffixes[language] || suffixes.english;
  }

  private async generateResponse(
    message: string,
    style: string,
    language: string,
  ): Promise<string> {
    // Simulate different response styles and languages
    const responses = {
      english: {
        casual: `Hey! I'd be happy to help with that. ${message}`,
        formal: `Good day. I shall assist you with your inquiry regarding ${message}.`,
      },
      chinese: {
        casual: `你好！我很乐意帮助你。关于${message}`,
        formal: `您好。我将协助您处理关于${message}的询问。`,
      },
      japanese: {
        casual: `こんにちは！喜んでお手伝いします。${message}について`,
        formal: `お疲れ様です。${message}に関するお問い合わせにお答えいたします。`,
      },
    };

    return responses[language]?.[style] || responses.english.casual;
  }
}

// 3. Initialize Agent with Options
const agent = new BasicChatAgent();

export { serverOptions, BasicChatAgent };
