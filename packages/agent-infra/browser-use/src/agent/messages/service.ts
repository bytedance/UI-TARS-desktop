/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/messages/service.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import {
  type BaseMessage,
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import {
  MessageHistory,
  type MessageMetadata,
  type ManagedMessage,
} from './views';
import { createLogger } from '../../utils';
import { ToolCall } from '@langchain/core/dist/messages/tool';

const logger = createLogger('MessageManager');

export default class MessageManager {
  private maxInputTokens: number;
  private history: MessageHistory;
  private estimatedCharactersPerToken: number;
  private readonly IMG_TOKENS: number;
  private sensitiveData?: Record<string, string>;
  private toolId: number;

  constructor({
    maxInputTokens = 128000,
    estimatedCharactersPerToken = 3,
    imageTokens = 800,
    sensitiveData,
  }: {
    maxInputTokens?: number;
    estimatedCharactersPerToken?: number;
    imageTokens?: number;
    sensitiveData?: Record<string, string>;
  } = {}) {
    this.maxInputTokens = maxInputTokens;
    this.history = new MessageHistory();
    this.estimatedCharactersPerToken = estimatedCharactersPerToken;
    this.IMG_TOKENS = imageTokens;
    this.sensitiveData = sensitiveData;
    this.toolId = 1;
  }

  public initTaskMessages(
    systemMessage: SystemMessage,
    task: string,
    messageContext?: string,
  ): void {
    // Add system message
    this.addMessageWithTokens(systemMessage);

    // Add context message if provided
    if (messageContext && messageContext.length > 0) {
      const contextMessage = new HumanMessage({
        content: `Context for the task: ${messageContext}`,
      });
      this.addMessageWithTokens(contextMessage);
    }

    // Add task instructions
    const taskMessage = MessageManager.taskInstructions(task);
    this.addMessageWithTokens(taskMessage);

    // Add sensitive data info if sensitive data is provided
    if (this.sensitiveData) {
      const info = `Here are placeholders for sensitive data: ${Object.keys(this.sensitiveData)}`;
      const infoMessage = new HumanMessage({
        content: `${info}\nTo use them, write <secret>the placeholder name</secret>`,
      });
      this.addMessageWithTokens(infoMessage);
    }

    // Add example output
    const placeholderMessage = new HumanMessage({
      content: 'Example output:',
    });
    this.addMessageWithTokens(placeholderMessage);

    const toolCallId = this.nextToolId();
    const toolCalls: ToolCall[] = [
      {
        name: 'navigator_output',
        // @ts-ignore
        description: 'Navigate to the page and click on the element',
        parameters: zodToJsonSchema(
          z.object({
            current_state: z.object({
              page_summary: z.string(),
              evaluation_previous_goal: z.string(),
              memory: z.string(),
              next_goal: z.string(),
            }),
            action: z.array(
              z.object({
                click_element: z.object({
                  index: z.number(),
                }),
              }),
            ),
          }),
        ),
        args: {
          current_state: {
            page_summary:
              'On the page are company a,b,c wtih their revenue 1,2,3.',
            evaluation_previous_goal: 'Success - I opend the first page',
            memory: 'Starting with the new task. I have completed 1/10 steps',
            next_goal: 'Click on company a',
          },
          action: [{ click_element: { index: 0 } }],
        },

        id: String(toolCallId),
        type: 'tool_call' as const,
      },
    ];

    const exampleToolCall = new AIMessage({
      content: 'example tool call',
      tool_calls: toolCalls,
    });
    this.addMessageWithTokens(exampleToolCall);

    const toolMessage = new ToolMessage({
      content: 'Browser started',
      tool_call_id: String(toolCallId),
    });
    this.addMessageWithTokens(toolMessage);

    // Add history start marker
    const historyStartMessage = new HumanMessage({
      content: '[Your task history memory starts here]',
    });
    this.addMessageWithTokens(historyStartMessage);
  }

  public nextToolId(): number {
    const id = this.toolId;
    this.toolId += 1;
    return id;
  }

  /**
   * Createthe task instructions
   * @param task - The raw description of the task
   * @returns A HumanMessage object containing the task instructions
   */
  private static taskInstructions(task: string): HumanMessage {
    const content = `Your ultimate task is: """${task}""". If you achieved your ultimate task, stop everything and use the done action in the next step to complete the task. If not, continue as usual.`;
    return new HumanMessage({ content });
  }

  /**
   * Returns the number of messages in the history
   * @returns The number of messages in the history
   */
  public length(): number {
    return this.history.messages.length;
  }

  /**
   * Adds a new task to execute, it will be executed based on the history
   * @param newTask - The raw description of the new task
   */
  public addNewTask(newTask: string): void {
    const content = `Your new ultimate task is: """${newTask}""". Take the previous context into account and finish your new ultimate task. `;
    const msg = new HumanMessage({ content });
    this.addMessageWithTokens(msg);
  }

  /**
   * Adds a plan message to the history
   * @param plan - The raw description of the plan
   * @param position - The position to add the plan
   */
  public addPlan(plan?: string, position?: number): void {
    if (plan) {
      const msg = new AIMessage({ content: plan });
      this.addMessageWithTokens(msg, position);
    }
  }

  /**
   * Adds a state message to the history
   * @param stateMessage - The HumanMessage object containing the state
   */
  public addStateMessage(stateMessage: HumanMessage): void {
    this.addMessageWithTokens(stateMessage);
  }

  /**
   * Removes the last state message from the history
   */
  public removeLastStateMessage(): void {
    this.history.removeLastHumanMessage();
  }

  public getMessages(): BaseMessage[] {
    const messages = this.history.messages.map((m) => m.message);

    let totalInputTokens = 0;
    logger.debug(`Messages in history: ${this.history.messages.length}:`);

    for (const m of this.history.messages) {
      totalInputTokens += m.metadata.inputTokens;
      // logger.debug(
      //   `${m.message.constructor.name} - Token count: ${m.metadata.inputTokens}`,
      // );
    }

    // logger.debug(`Total input tokens: ${totalInputTokens}`);
    return messages;
  }

  public getMessagesWithTokens(): ManagedMessage[] {
    return this.history.messages;
  }

  /**
   * Adds a message to the history with the token count metadata
   * @param message - The BaseMessage object to add
   * @param position - The optional position to add the message, if not provided, the message will be added to the end of the history
   */
  public addMessageWithTokens(message: BaseMessage, position?: number): void {
    let filteredMessage = message;
    // filter out sensitive data if provided
    if (this.sensitiveData) {
      filteredMessage = this._filterSensitiveData(message);
    }

    const tokenCount = this._countTokens(filteredMessage);
    const metadata: MessageMetadata = { inputTokens: tokenCount };
    this.history.addMessage(filteredMessage, metadata, position);
  }

  /**
   * Filters out sensitive data from the message
   * @param message - The BaseMessage object to filter
   * @returns The filtered BaseMessage object
   */
  private _filterSensitiveData(message: BaseMessage): BaseMessage {
    const replaceSensitive = (value: string): string => {
      let filteredValue = value;
      if (!this.sensitiveData) return filteredValue;

      for (const [key, val] of Object.entries(this.sensitiveData)) {
        filteredValue = filteredValue.replace(val, `<secret>${key}</secret>`);
      }
      return filteredValue;
    };

    if (typeof message.content === 'string') {
      message.content = replaceSensitive(message.content);
    } else if (Array.isArray(message.content)) {
      message.content = message.content.map((item) => {
        if (typeof item === 'object' && 'text' in item) {
          return { ...item, text: replaceSensitive(item.text) };
        }
        return item;
      });
    }

    return message;
  }

  /**
   * Counts the tokens in the message
   * @param message - The BaseMessage object to count the tokens
   * @returns The number of tokens in the message
   */
  private _countTokens(message: BaseMessage): number {
    let tokens = 0;

    if (Array.isArray(message.content)) {
      for (const item of message.content) {
        if ('image_url' in item) {
          tokens += this.IMG_TOKENS;
        } else if (typeof item === 'object' && 'text' in item) {
          tokens += this._countTextTokens(item.text);
        }
      }
    } else {
      let msg = message.content;
      // Check if it's an AIMessage with tool_calls
      if ('tool_calls' in message) {
        msg += JSON.stringify(message.tool_calls);
      }
      tokens += this._countTextTokens(msg);
    }

    return tokens;
  }

  /**
   * Counts the tokens in the text
   * Rough estimate, no tokenizer provided for now
   * @param text - The text to count the tokens
   * @returns The number of tokens in the text
   */
  private _countTextTokens(text: string): number {
    return Math.floor(text.length / this.estimatedCharactersPerToken);
  }

  /**
   * Cuts the last message if the total tokens exceed the max input tokens
   *
   * Get current message list, potentially trimmed to max tokens
   */
  public cutMessages(): void {
    let diff = this.history.totalTokens - this.maxInputTokens;
    if (diff <= 0) return;

    const lastMsg = this.history.messages[this.history.messages.length - 1];

    // if list with image remove image
    if (Array.isArray(lastMsg.message.content)) {
      let text = '';
      lastMsg.message.content = lastMsg.message.content.filter((item) => {
        if ('image_url' in item) {
          diff -= this.IMG_TOKENS;
          lastMsg.metadata.inputTokens -= this.IMG_TOKENS;
          this.history.totalTokens -= this.IMG_TOKENS;
          logger.debug(
            `Removed image with ${this.IMG_TOKENS} tokens - total tokens now: ${this.history.totalTokens}/${this.maxInputTokens}`,
          );
          return false;
        }
        if ('text' in item) {
          text += item.text;
        }
        return true;
      });
      lastMsg.message.content = text;
      this.history.messages[this.history.messages.length - 1] = lastMsg;
    }

    if (diff <= 0) return;

    // if still over, remove text from state message proportionally to the number of tokens needed with buffer
    // Calculate the proportion of content to remove
    const proportionToRemove = diff / lastMsg.metadata.inputTokens;
    if (proportionToRemove > 0.99) {
      throw new Error(
        `Max token limit reached - history is too long - reduce the system prompt or task. proportion_to_remove: ${proportionToRemove}`,
      );
    }
    logger.debug(
      `Removing ${(proportionToRemove * 100).toFixed(2)}% of the last message (${(proportionToRemove * lastMsg.metadata.inputTokens).toFixed(2)} / ${lastMsg.metadata.inputTokens.toFixed(2)} tokens)`,
    );

    const content = lastMsg.message.content as string;
    const charactersToRemove = Math.floor(content.length * proportionToRemove);
    const newContent = content.slice(0, -charactersToRemove);

    this.history.removeMessage(-1);

    const msg = new HumanMessage({ content: newContent });
    this.addMessageWithTokens(msg);

    const finalMsg = this.history.messages[this.history.messages.length - 1];
    logger.debug(
      `Added message with ${finalMsg.metadata.inputTokens} tokens - total tokens now: ${this.history.totalTokens}/${this.maxInputTokens} - total messages: ${this.history.messages.length}`,
    );
  }

  /**
   * Converts messages for non-function-calling models
   * @param inputMessages - The BaseMessage objects to convert
   * @returns The converted BaseMessage objects
   */
  public convertMessagesForNonFunctionCallingModels(
    inputMessages: BaseMessage[],
  ): BaseMessage[] {
    return inputMessages.map((message) => {
      if (message instanceof HumanMessage || message instanceof SystemMessage) {
        return message;
      }
      if (message instanceof ToolMessage) {
        return new HumanMessage({ content: message.content });
      }
      if (message instanceof AIMessage) {
        // if it's an AIMessage with tool_calls, convert it to a normal AIMessage
        if ('tool_calls' in message) {
          const toolCalls = JSON.stringify(message.tool_calls);
          return new AIMessage({ content: toolCalls });
        }
        return message;
      }
      throw new Error(`Unknown message type: ${message.constructor.name}`);
    });
  }

  /**
   * Some models like deepseek-reasoner dont allow multiple human messages in a row. This function merges them into one."
   * @param messages - The BaseMessage objects to merge
   * @param classToMerge - The class of the messages to merge
   * @returns The merged BaseMessage objects
   */
  public mergeSuccessiveMessages(
    messages: BaseMessage[],
    classToMerge: typeof BaseMessage,
  ): BaseMessage[] {
    const mergedMessages: BaseMessage[] = [];
    let streak = 0;

    for (const message of messages) {
      if (message instanceof classToMerge) {
        streak += 1;
        if (streak > 1) {
          const lastMessage = mergedMessages[mergedMessages.length - 1];
          if (Array.isArray(message.content)) {
            const firstContent = message.content[0];
            if ('text' in firstContent) {
              lastMessage.content += firstContent.text;
            }
          } else {
            lastMessage.content += message.content;
          }
        } else {
          mergedMessages.push(message);
        }
      } else {
        mergedMessages.push(message);
        streak = 0;
      }
    }

    return mergedMessages;
  }
}
