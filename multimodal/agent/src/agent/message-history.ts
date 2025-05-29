/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Event,
  EventStream,
  EventType,
  ToolCallEngine,
  ToolResultEvent,
  ToolDefinition,
  AssistantMessageEvent,
  AgentSingleLoopReponse,
  MultimodalToolCallResult,
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  UserMessageEvent,
  EnvironmentInputEvent,
  PlanUpdateEvent,
} from '@multimodal/agent-interface';
import { convertToMultimodalToolCallResult } from '../utils/multimodal';
import { getLogger } from '../utils/logger';
import { isTest } from '../utils/env';

/**
 * Interface for image information in messages
 */
interface ImageReference {
  eventIndex: number;
  contentIndex: number;
  event: Event;
}

/**
 * MessageHistory - Converts event stream to message history
 * This separates the concerns of event storage from message history formatting
 *
 * Features:
 * - Handles multimodal content including text and images
 * - Limits images to prevent context window overflow
 * - Maintains conversation structure for LLM context
 * - Supports environment inputs as part of the conversation
 */
export class MessageHistory {
  private logger = getLogger('MessageHistory');

  /**
   * Creates a new MessageHistory instance
   *
   * @param eventStream - The event stream to convert to message history
   * @param maxImagesCount - Optional maximum number of images to include in the context.
   *                         When specified, limits the total number of images in the conversation history
   *                         to prevent context window overflow. Images beyond this limit will be
   *                         replaced with text placeholders to preserve context while reducing token usage.
   */
  constructor(
    private eventStream: EventStream,
    private maxImagesCount?: number,
  ) {}

  /**
   * Convert events to message history format for LLM context
   * This method uses the provided toolCallEngine to format messages
   * according to the specific requirements of the underlying LLM
   *
   * @param toolCallEngine The tool call engine to use for message formatting
   * @param systemPrompt The base system prompt to include
   * @param tools Available tools to enhance the system prompt
   */
  toMessageHistory(
    toolCallEngine: ToolCallEngine,
    customSystemPrompt: string,
    tools: ToolDefinition[] = [],
  ): ChatCompletionMessageParam[] {
    const baseSystemPrompt = this.getSystemPromptWithTime(customSystemPrompt);
    // Start with the enhanced system message
    const enhancedSystemPrompt = toolCallEngine.preparePrompt(baseSystemPrompt, tools);
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: enhancedSystemPrompt },
    ];

    this.logger.debug(
      `Created system message with prompt ${enhancedSystemPrompt.length} chars long`,
    );

    const events = this.eventStream.getEvents();

    // Create a unified processing path with optional image limiting
    this.processEvents(events, messages, toolCallEngine);

    return messages;
  }

  /**
   * Process all events in a single unified path with optional image limiting
   */
  private processEvents(
    events: Event[],
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    // If image limiting is enabled, identify which images should be omitted
    const imagesToOmit =
      this.maxImagesCount !== undefined ? this.getImagesToOmit(events) : new Set<string>();

    // Process events in order
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex];

      if (event.type === EventType.USER_MESSAGE) {
        this.processUserMessage(event as UserMessageEvent, eventIndex, imagesToOmit, messages);
      } else if (event.type === EventType.ASSISTANT_MESSAGE) {
        this.processAssistantMessage(
          event as AssistantMessageEvent,
          events,
          eventIndex,
          imagesToOmit,
          messages,
          toolCallEngine,
        );
      } else if (event.type === EventType.ENVIRONMENT_INPUT) {
        this.processEnvironmentInput(
          event as EnvironmentInputEvent,
          eventIndex,
          imagesToOmit,
          messages,
        );
      } else if (event.type === EventType.PLAN_UPDATE) {
        this.processPlanUpdate(event as PlanUpdateEvent, messages);
      }
    }

    if (this.maxImagesCount !== undefined) {
      const totalImages = this.countAllImagesInEvents(events);
      const omittedImages = imagesToOmit.size;

      this.logger.info(
        `Message history built with ${totalImages - omittedImages} images ` +
          `(limit: ${this.maxImagesCount}, ${omittedImages} images replaced with placeholders)`,
      );
    }
  }

  /**
   * Process plan update event
   * Adds plan information as a system message to guide the agent
   */
  private processPlanUpdate(event: PlanUpdateEvent, messages: ChatCompletionMessageParam[]): void {
    // Format the plan steps as a readable list
    const planStepsText = event.steps
      .map((step, index) => `${index + 1}. [${step.done ? 'DONE' : 'TODO'}] ${step.content}`)
      .join('\n');

    // Add as system message to guide the agent's next actions
    messages.push({
      role: 'system',
      content: `Current plan status:\n${planStepsText}\n\nFollow this plan. If a step is done, move to the next step.`,
    });
  }

  /**
   * Process all images in all events
   */
  private countAllImagesInEvents(events: Event[]): number {
    return events.reduce((total, event) => {
      if (
        (event.type === EventType.USER_MESSAGE ||
          event.type === EventType.TOOL_RESULT ||
          event.type === EventType.ENVIRONMENT_INPUT) &&
        Array.isArray(event.content)
      ) {
        return total + this.countImagesInContent(event.content);
      }
      return total;
    }, 0);
  }

  /**
   * Get a set of image references that should be omitted based on the sliding window
   */
  private getImagesToOmit(events: Event[]): Set<string> {
    if (this.maxImagesCount === undefined) {
      return new Set<string>();
    }

    // Collect all images from newest to oldest
    const allImages = this.collectAllImageReferences(events);

    // If we have more images than the limit, mark oldest ones for omission
    const imagesToOmit = new Set<string>();
    if (allImages.length > this.maxImagesCount) {
      // Skip the newest maxImagesCount images, and mark the rest for omission
      const imagesToBeOmitted = allImages.slice(this.maxImagesCount);

      for (const img of imagesToBeOmitted) {
        imagesToOmit.add(`${img.eventIndex}:${img.contentIndex}`);
      }

      this.logger.info(
        `Image limiting: ${allImages.length} total images, omitting ${imagesToOmit.size} oldest images (limit: ${this.maxImagesCount})`,
      );
    }

    return imagesToOmit;
  }

  /**
   * Collect all image references from events, ordered from newest to oldest
   */
  private collectAllImageReferences(events: Event[]): ImageReference[] {
    const imageReferences: ImageReference[] = [];

    // Scan events in reverse order (newest first)
    for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex--) {
      const event = events[eventIndex];

      if (
        (event.type === EventType.USER_MESSAGE ||
          event.type === EventType.TOOL_RESULT ||
          event.type === EventType.ENVIRONMENT_INPUT) &&
        Array.isArray(event.content)
      ) {
        // Find images in this event's content
        event.content.forEach((part, contentIndex) => {
          if (typeof part === 'object' && (part.type === 'image_url' || part.type === 'image')) {
            imageReferences.push({
              eventIndex,
              contentIndex,
              event,
            });
          }
        });
      }
    }

    return imageReferences;
  }

  /**
   * Process a user message
   */
  private processUserMessage(
    event: UserMessageEvent,
    eventIndex: number,
    imagesToOmit: Set<string>,
    messages: ChatCompletionMessageParam[],
  ): void {
    const content = event.content;

    if (typeof content === 'string') {
      messages.push({
        role: 'user',
        content: content,
      });
      return;
    }

    // Process the content, potentially omitting images
    const processedContent = this.processContent(content, eventIndex, imagesToOmit);

    // Add to messages
    messages.push({
      role: 'user',
      content: processedContent,
    });
  }

  /**
   * Process content, replacing omitted images with placeholder text
   */
  private processContent(
    content: string | ChatCompletionContentPart[],
    eventIndex: number,
    imagesToOmit: Set<string>,
  ): ChatCompletionContentPart[] {
    // If content is a string, convert to content part
    if (typeof content === 'string') {
      return [{ type: 'text', text: content }];
    }

    // If no image omission needed, return as is
    if (imagesToOmit.size === 0) {
      return content;
    }

    // Process each content part, potentially replacing images with placeholders
    return content.map((part, contentIndex) => {
      if (
        typeof part === 'object' &&
        part.type === 'image_url' &&
        imagesToOmit.has(`${eventIndex}:${contentIndex}`)
      ) {
        return {
          type: 'text',
          text: '[Image omitted to conserve context]',
        };
      }
      return part;
    });
  }

  /**
   * Process an assistant message and its tool calls
   */
  private processAssistantMessage(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
    eventIndex: number,
    imagesToOmit: Set<string>,
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    // Format the assistant message
    const assistantResponse: AgentSingleLoopReponse = {
      content: assistantEvent.content,
      toolCalls: assistantEvent.toolCalls,
    };

    const formattedMessage = toolCallEngine.buildHistoricalAssistantMessage(assistantResponse);
    messages.push(formattedMessage);

    // Process tool calls if present
    if (assistantEvent.toolCalls?.length) {
      this.processToolCalls(assistantEvent, events, imagesToOmit, messages, toolCallEngine);
    }
  }

  /**
   * Process tool calls and their results
   */
  private processToolCalls(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
    imagesToOmit: Set<string>,
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    // Find corresponding tool results
    const toolResults = this.findToolResultsForAssistantMessage(assistantEvent, events);

    // If no results, return early
    if (toolResults.length === 0) {
      return;
    }

    // Convert to multimodal format and process
    const multimodalResults = toolResults.map((result) => {
      const convertedResult = convertToMultimodalToolCallResult(result);

      // Apply image omission to tool results if needed
      if (imagesToOmit.size > 0 && Array.isArray(convertedResult.content)) {
        // Find the event index for this tool result
        const toolResultEventIndex = events.findIndex(
          (e) =>
            e.type === EventType.TOOL_RESULT &&
            (e as ToolResultEvent).toolCallId === result.toolCallId,
        );

        if (toolResultEventIndex !== -1) {
          convertedResult.content = this.processContent(
            convertedResult.content,
            toolResultEventIndex,
            imagesToOmit,
          );
        }
      }

      return convertedResult;
    });

    // Format and add the tool results
    const toolResultMessages =
      toolCallEngine.buildHistoricalToolCallResultMessages(multimodalResults);
    messages.push(...toolResultMessages);
  }

  /**
   * Helper method to find all tool results associated with an assistant message's tool calls
   */
  private findToolResultsForAssistantMessage(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
  ) {
    // If no tool calls in the message, return empty array
    if (!assistantEvent.toolCalls?.length) {
      return [];
    }

    // Get all tool call IDs from the assistant message
    const toolCallIds = assistantEvent.toolCalls.map((tc) => tc.id);
    const assistantIndex = events.findIndex((e) => e.id === assistantEvent.id);
    const toolResults: { toolCallId: string; toolName: string; content: any }[] = [];

    // Find tool results after this assistant message until next conversation turn
    for (let i = assistantIndex + 1; i < events.length; i++) {
      const event = events[i];

      // Stop at new conversation turn
      if (
        event.type === EventType.USER_MESSAGE ||
        (event.type === EventType.ASSISTANT_MESSAGE && event !== assistantEvent)
      ) {
        break;
      }

      // Process tool result event
      if (event.type === EventType.TOOL_RESULT) {
        const toolResult = event as ToolResultEvent;
        if (toolCallIds.includes(toolResult.toolCallId)) {
          toolResults.push({
            toolCallId: toolResult.toolCallId,
            toolName: toolResult.name,
            content: toolResult.content,
          });
        }
      }
    }

    return toolResults;
  }

  /**
   * Count the number of images in multimodal content
   */
  private countImagesInContent(content: ChatCompletionContentPart[]): number {
    if (!Array.isArray(content)) {
      return 0;
    }

    return content.filter((part) => typeof part === 'object' && part.type === 'image_url').length;
  }

  /**
   * Generate the system prompt with current time
   */
  getSystemPromptWithTime(instructions: string): string {
    if (isTest()) {
      return `${instructions}

Current time: 5/20/2025, 10:00:00 AM`;
    }

    return `${instructions}

Current time: ${new Date().toLocaleString()}`;
  }

  /**
   * Process environment input event
   * Adds environment context as a user-like message but with a specific role
   */
  private processEnvironmentInput(
    event: EnvironmentInputEvent,
    eventIndex: number,
    imagesToOmit: Set<string>,
    messages: ChatCompletionMessageParam[],
  ): void {
    const content = event.content;
    const description = event.description || 'Environment Input';

    if (typeof content === 'string') {
      messages.push({
        role: 'user',
        content: `[Environment: ${description}] ${content}`,
      });
      return;
    }

    // Process the content, potentially omitting images
    const processedContent = this.processContent(content, eventIndex, imagesToOmit);

    // For multimodal content, add a text part with the description if not already present
    const hasTextPart = processedContent.some((part) => part.type === 'text');

    const finalContent = [...processedContent];
    if (!hasTextPart && event.description) {
      finalContent.unshift({
        type: 'text',
        text: `[Environment: ${description}]`,
      });
    } else if (hasTextPart && event.description) {
      // If there's already text, prefix the first text part
      const firstTextIndex = finalContent.findIndex((part) => part.type === 'text');
      if (firstTextIndex >= 0) {
        const textPart = finalContent[firstTextIndex] as { type: 'text'; text: string };
        finalContent[firstTextIndex] = {
          ...textPart,
          text: `[Environment: ${description}] ${textPart.text}`,
        };
      }
    }

    // Add to messages
    messages.push({
      role: 'user',
      content: finalContent,
    });
  }
}
