/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/agents/base.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import type {
  BaseChatModel,
  BaseChatModelCallOptions,
} from '@langchain/core/language_models/chat_models';
import type { AgentContext, AgentOutput } from '../types';
import type { BasePrompt } from '../prompts/base';
import {
  type BaseMessage,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { createLogger } from '../../utils';
import type { Action } from '../actions/builder';

const logger = createLogger('agent');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CallOptions = BaseChatModelCallOptions;

// Update options to use Zod schema
export interface BaseAgentOptions {
  chatLLM: BaseChatModel;
  context: AgentContext;
  prompt: BasePrompt;
}
export interface ExtraAgentOptions {
  id?: string;
  toolCallingMethod?: string;
  callOptions?: Partial<CallOptions>;
}

const THINK_TAGS = /<think>[\s\S]*?<\/think>/;

/**
 * Base class for all agents
 * @param T - The Zod schema for the model output
 * @param M - The type of the result field of the agent output
 */
export abstract class BaseAgent<T extends z.ZodType, M = unknown> {
  protected id: string;
  protected chatLLM: BaseChatModel;
  protected prompt: BasePrompt;
  protected context: AgentContext;
  protected actions: Record<string, Action> = {};
  protected modelOutputSchema: T;
  protected toolCallingMethod: string | null;
  protected chatModelLibrary: string;
  protected modelName: string;
  protected withStructuredOutput: boolean;
  protected callOptions?: CallOptions;
  protected modelOutputToolName: string;
  declare ModelOutput: z.infer<T>;

  constructor(
    modelOutputSchema: T,
    options: BaseAgentOptions,
    extraOptions?: Partial<ExtraAgentOptions>,
  ) {
    // base options
    this.modelOutputSchema = modelOutputSchema;
    this.chatLLM = options.chatLLM;
    this.prompt = options.prompt;
    this.context = options.context;
    this.chatModelLibrary = this.chatLLM.constructor.name;
    this.modelName = this.setModelNames();
    this.withStructuredOutput = this.setWithStructuredOutput();
    // extra options
    this.id = extraOptions?.id || 'agent';
    this.toolCallingMethod = this.setToolCallingMethod(
      extraOptions?.toolCallingMethod,
    );
    this.callOptions = extraOptions?.callOptions;
    this.modelOutputToolName = `${this.id}_output`;
  }

  // Set the model name
  private setModelNames(): string {
    if ('model_name' in this.chatLLM) {
      return this.chatLLM.model_name as string;
    }
    if ('model' in this.chatLLM) {
      return this.chatLLM.model as string;
    }
    return 'Unknown';
  }

  // Set the tool calling method
  private setToolCallingMethod(toolCallingMethod?: string): string | null {
    if (toolCallingMethod === 'auto') {
      switch (this.chatModelLibrary) {
        case 'ChatGoogleGenerativeAI':
          return null;
        case 'ChatOpenAI':
        case 'AzureChatOpenAI':
          return 'function_calling';
        default:
          return null;
      }
    }
    return toolCallingMethod || null;
  }

  // Set whether to use structured output based on the model name
  private setWithStructuredOutput(): boolean {
    if (
      this.modelName === 'deepseek-reasoner' ||
      this.modelName === 'deepseek-r1' ||
      this.modelName.includes('claude')
    ) {
      return false;
    }
    return true;
  }

  // Remove think tags from the model output
  protected removeThinkTags(text: string): string {
    return text.replace(THINK_TAGS, '');
  }

  async invoke(inputMessages: BaseMessage[]): Promise<this['ModelOutput']> {
    // Use structured output
    if (this.withStructuredOutput) {
      const structuredLlm = this.chatLLM.withStructuredOutput(
        this.modelOutputSchema,
        {
          includeRaw: true,
          name: this.modelOutputToolName,
          strict: true,
        },
      );

      const response = await structuredLlm.invoke(inputMessages, {
        ...this.callOptions,
      });
      if (response.parsed) {
        return response.parsed;
      }
      throw new Error('Could not parse response');
    }

    // Without structured output support, need to extract JSON from model output manually
    const response = await this.chatLLM.invoke(inputMessages, {
      ...this.callOptions,
    });
    if (typeof response.content === 'string') {
      response.content = this.removeThinkTags(response.content);
      try {
        const extractedJson = this.extractJsonFromModelOutput(response.content);
        const parsed = this.validateModelOutput(extractedJson);
        if (parsed) {
          return parsed;
        }
      } catch (error) {
        logger.error('Could not parse response', response);
        throw new Error('Could not parse response');
      }
    }
    throw new Error('Could not parse response');
  }

  // Execute the agent and return the result
  abstract execute(): Promise<AgentOutput<M>>;

  // Helper method to validate metadata
  protected validateModelOutput(
    data: unknown,
  ): this['ModelOutput'] | undefined {
    if (!this.modelOutputSchema || !data) return undefined;
    return this.modelOutputSchema.parse(data);
  }

  // Add the model output to the memory
  protected addModelOutputToMemory(modelOutput: this['ModelOutput']): void {
    const messageManager = this.context.messageManager;
    const toolCallId = String(messageManager.nextToolId());
    const toolCalls = [
      {
        name: this.modelOutputToolName,
        args: modelOutput,
        id: toolCallId,
        type: 'tool_call' as const,
      },
    ];

    const toolCallMessage = new AIMessage({
      content: 'tool call',
      tool_calls: toolCalls,
    });
    messageManager.addMessageWithTokens(toolCallMessage);

    const toolMessage = new ToolMessage({
      content: 'tool call response placeholder',
      tool_call_id: toolCallId,
    });
    messageManager.addMessageWithTokens(toolMessage);
  }

  /**
   * Extract JSON from raw string model output, handling both plain JSON and code-block-wrapped JSON.
   *
   * some models not supporting tool calls well like deepseek-reasoner, so we need to extract the JSON from the output
   * @param content - The content of the model output
   * @returns The JSON object
   */
  protected extractJsonFromModelOutput(content: string): unknown {
    try {
      let cleanedContent = content;
      // If content is wrapped in code blocks, extract just the JSON part
      if (content.includes('```')) {
        // Find the JSON content between code blocks
        cleanedContent = cleanedContent.split('```')[1];
        // Remove language identifier if present (e.g., 'json\n')
        if (cleanedContent.includes('\n')) {
          cleanedContent = cleanedContent.split('\n', 2)[1];
        }
      } else {
        const jsonRegex = /(\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\})/;
        const match = cleanedContent.match(jsonRegex);
        if (match && match[1]) {
          cleanedContent = match[1];
        }
      }

      cleanedContent = jsonrepair(cleanedContent);

      // Parse the cleaned content
      return JSON.parse(cleanedContent);
    } catch (e) {
      logger.warning(`Failed to parse model output: ${content} ${e}`);
      throw new Error('Could not parse response.');
    }
  }
}
