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
} from '@multimodal/agent-interface';
import { convertToMultimodalToolCallResult } from '../utils/multimodal';
import { getLogger } from '../utils/logger';
import { isTest } from '../utils/env';

/**
 * Interface for image information collected during processing
 */
interface ImageInfo {
  eventIndex: number;
  contentIndex: number;
}

/**
 * MessageHistory - Converts event stream to message history
 * This separates the concerns of event storage from message history formatting
 *
 * Features:
 * - Handles multimodal content including text and images
 * - Limits images to prevent context window overflow
 * - Maintains conversation structure for LLM context
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

    // Process messages differently based on whether image limiting is enabled
    if (this.maxImagesCount !== undefined) {
      this.processEventsWithImageLimiting(events, messages, toolCallEngine);
    } else {
      this.processEventsWithoutImageLimiting(events, messages, toolCallEngine);
    }

    return messages;
  }

  /**
   * Process events with image limiting enabled
   */
  private processEventsWithImageLimiting(
    events: Event[],
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    // First scan for images - collect info about all images in reverse order (newest first)
    const imageInfos = this.collectImageInfosFromEvents(events);

    // Identify images to strip (oldest ones beyond the limit)
    const imagesToStrip = this.identifyImagesToStrip(imageInfos);

    // Process events with image stripping
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const event = events[eventIndex];

      if (event.type === EventType.USER_MESSAGE) {
        this.processUserMessageWithImageStripping(event, eventIndex, imagesToStrip, messages);
      } else if (event.type === EventType.ASSISTANT_MESSAGE) {
        this.processAssistantMessageWithImageStripping(
          event as AssistantMessageEvent,
          events,
          eventIndex,
          imagesToStrip,
          messages,
          toolCallEngine,
        );
      }
    }

    this.logger.info(
      `Message history built with ${
        imageInfos.length - imagesToStrip.size
      } images (limit: ${this.maxImagesCount}, ${imagesToStrip.size} images replaced with placeholders)`,
    );
  }

  /**
   * Process events without image limiting
   */
  private processEventsWithoutImageLimiting(
    events: Event[],
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    let imageCount = 0;
    let currentIndex = 0;

    while (currentIndex < events.length) {
      const event = events[currentIndex];

      if (event.type === EventType.USER_MESSAGE) {
        // Apply image limiting if needed
        let content = event.content;
        if (this.maxImagesCount !== undefined && Array.isArray(content)) {
          content = this.limitImagesInContent(content, imageCount);
          // Update image count
          imageCount += this.countImagesInContent(content);
        }

        messages.push({
          role: 'user',
          content,
        });
      } else if (event.type === EventType.ASSISTANT_MESSAGE) {
        const assistantEvent = event as AssistantMessageEvent;
        this.processAssistantMessage(assistantEvent, events, messages, toolCallEngine);
      }

      currentIndex++;
    }

    if (this.maxImagesCount !== undefined) {
      this.logger.info(
        `Message history built with ${imageCount} images (max: ${this.maxImagesCount})`,
      );
    }
  }

  /**
   * Collect information about all images in the events
   */
  private collectImageInfosFromEvents(events: Event[]): ImageInfo[] {
    const imageInfos: ImageInfo[] = [];

    // Scan events in reverse order to prioritize newer images
    for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex--) {
      const event = events[eventIndex];

      if (
        (event.type === EventType.USER_MESSAGE || event.type === EventType.TOOL_RESULT) &&
        Array.isArray(event.content)
      ) {
        // Look for images in this event
        for (let contentIndex = 0; contentIndex < event.content.length; contentIndex++) {
          const part = event.content[contentIndex];
          if (typeof part === 'object' && (part.type === 'image_url' || part.type === 'image')) {
            // Store info about this image
            imageInfos.push({
              eventIndex,
              contentIndex,
            });
          }
        }
      }
    }

    return imageInfos;
  }

  /**
   * Identify which images should be stripped based on max image count
   */
  private identifyImagesToStrip(imageInfos: ImageInfo[]): Set<string> {
    const imagesToStrip = new Set<string>();

    if (this.maxImagesCount !== undefined && imageInfos.length > this.maxImagesCount) {
      // Convert imageInfos to unique identifiers and add the oldest ones to the strip set
      const strippedImages = imageInfos.slice(this.maxImagesCount);
      for (const img of strippedImages) {
        imagesToStrip.add(`${img.eventIndex}:${img.contentIndex}`);
      }

      this.logger.info(
        `Image limiting: ${imageInfos.length} total images, stripping ${imagesToStrip.size} oldest images (limit: ${this.maxImagesCount})`,
      );
    }

    return imagesToStrip;
  }

  /**
   * Process user message with image stripping
   */
  private processUserMessageWithImageStripping(
    event: UserMessageEvent,
    eventIndex: number,
    imagesToStrip: Set<string>,
    messages: ChatCompletionMessageParam[],
  ): void {
    const content = event.content;
    const processedContent: ChatCompletionContentPart[] = [];

    // Apply image stripping if needed
    if (Array.isArray(content)) {
      for (let contentIndex = 0; contentIndex < content.length; contentIndex++) {
        const part = content[contentIndex];

        // Check if this image should be stripped
        if (
          typeof part === 'object' &&
          part.type === 'image_url' &&
          imagesToStrip.has(`${eventIndex}:${contentIndex}`)
        ) {
          processedContent.push({
            type: 'text',
            text: `[Image omitted to conserve context]`,
          });
        } else {
          // Keep this content part
          processedContent.push(part);
        }
      }
    } else if (typeof content === 'string') {
      processedContent.push({
        type: 'text',
        text: content,
      });
    }

    // Add to messages
    messages.push({
      role: 'user',
      content: processedContent,
    });
  }

  /**
   * Process assistant message with image stripping in tool results
   */
  private processAssistantMessageWithImageStripping(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
    eventIndex: number,
    imagesToStrip: Set<string>,
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    // Process the assistant message itself
    const assistantResponse: AgentSingleLoopReponse = {
      content: assistantEvent.content,
      toolCalls: assistantEvent.toolCalls,
    };

    // Use the tool call engine to format the assistant message properly
    const formattedMessage = toolCallEngine.buildHistoricalAssistantMessage(assistantResponse);
    messages.push(formattedMessage);

    // Check if there are tool calls to process
    if (assistantEvent.toolCalls && assistantEvent.toolCalls.length > 0) {
      // Find tool results for these tool calls
      const toolResults = this.findToolResultsForAssistantMessage(assistantEvent, events);

      // Convert to multimodal tool call results
      const multimodalResults: MultimodalToolCallResult[] = toolResults.map((result) =>
        convertToMultimodalToolCallResult(result),
      );

      // Apply image stripping for tool results if needed
      this.applyImageStrippingToToolResults(multimodalResults, events, imagesToStrip);

      // Use the tool call engine to format the tool results properly
      if (multimodalResults.length > 0) {
        const toolResultMessages =
          toolCallEngine.buildHistoricalToolCallResultMessages(multimodalResults);
        messages.push(...toolResultMessages);
      }
    }
  }

  /**
   * Apply image stripping to tool results
   */
  private applyImageStrippingToToolResults(
    multimodalResults: MultimodalToolCallResult[],
    events: Event[],
    imagesToStrip: Set<string>,
  ): void {
    for (let resultIndex = 0; resultIndex < multimodalResults.length; resultIndex++) {
      const result = multimodalResults[resultIndex];

      // Find the actual event index for this tool result
      const toolResultEventIndex = events.findIndex(
        (e) =>
          e.type === EventType.TOOL_RESULT &&
          (e as ToolResultEvent).toolCallId === result.toolCallId,
      );

      if (toolResultEventIndex !== -1 && Array.isArray(result.content)) {
        const processedContent: ChatCompletionContentPart[] = [];

        for (let contentIndex = 0; contentIndex < result.content.length; contentIndex++) {
          const part = result.content[contentIndex];

          // Check if this image should be stripped
          if (
            typeof part === 'object' &&
            part.type === 'image_url' &&
            imagesToStrip.has(`${toolResultEventIndex}:${contentIndex}`)
          ) {
            processedContent.push({
              type: 'text',
              text: `[Image omitted to conserve context]`,
            });
          } else {
            // Keep this content part
            processedContent.push(part);
          }
        }

        result.content = processedContent;
      }
    }
  }

  /**
   * Process a standard assistant message
   */
  private processAssistantMessage(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
    messages: ChatCompletionMessageParam[],
    toolCallEngine: ToolCallEngine,
  ): void {
    const assistantResponse: AgentSingleLoopReponse = {
      content: assistantEvent.content,
      toolCalls: assistantEvent.toolCalls,
    };

    // Use the tool call engine to format the assistant message properly
    const formattedMessage = toolCallEngine.buildHistoricalAssistantMessage(assistantResponse);
    messages.push(formattedMessage);

    // Check if there are tool calls to process
    if (assistantEvent.toolCalls && assistantEvent.toolCalls.length > 0) {
      // Find tool results for these tool calls
      const toolResults = this.findToolResultsForAssistantMessage(assistantEvent, events);

      // Convert to multimodal tool call results
      const multimodalResults: MultimodalToolCallResult[] = toolResults.map((result) =>
        convertToMultimodalToolCallResult(result),
      );

      // Use the tool call engine to format the tool results properly
      if (multimodalResults.length > 0) {
        const toolResultMessages =
          toolCallEngine.buildHistoricalToolCallResultMessages(multimodalResults);
        messages.push(...toolResultMessages);
      }
    }
  }

  /**
   * Generate the system prompt with current time
   *
   * @returns Formatted system prompt with current time
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
   * Helper method to find all tool results associated with an assistant message's tool calls
   */
  private findToolResultsForAssistantMessage(
    assistantEvent: AssistantMessageEvent,
    events: Event[],
  ) {
    const toolResults: { toolCallId: string; toolName: string; content: any }[] = [];

    // If no tool calls in the message, return empty array
    if (!assistantEvent.toolCalls || assistantEvent.toolCalls.length === 0) {
      return toolResults;
    }

    // Get all tool call IDs from the assistant message
    const toolCallIds = assistantEvent.toolCalls.map((tc) => tc.id);

    // Find the corresponding tool results for these tool call IDs
    const assistantIndex = events.findIndex((e) => e.id === assistantEvent.id);

    // Look for tool result events after this assistant message
    // and before the next assistant or user message
    let currentIndex = assistantIndex + 1;
    while (currentIndex < events.length) {
      const event = events[currentIndex];

      // Stop if we reach a new conversation turn
      if (
        event.type === EventType.USER_MESSAGE ||
        (event.type === EventType.ASSISTANT_MESSAGE && event !== assistantEvent)
      ) {
        break;
      }

      // Process tool result events
      if (event.type === EventType.TOOL_RESULT) {
        const toolResultEvent = event as ToolResultEvent;
        if (toolCallIds.includes(toolResultEvent.toolCallId)) {
          toolResults.push({
            toolCallId: toolResultEvent.toolCallId,
            toolName: toolResultEvent.name,
            content: toolResultEvent.content,
          });
        }
      }

      currentIndex++;
    }

    return toolResults;
  }

  /**
   * Count the number of images in multimodal content
   * @param content Array of content parts
   * @returns Number of images in the content
   */
  private countImagesInContent(content: ChatCompletionContentPart[]): number {
    if (!Array.isArray(content)) {
      return 0;
    }

    return content.filter((part) => typeof part === 'object' && part.type === 'image_url').length;
  }

  /**
   * Limit the number of images in content based on remaining image quota
   * When the image limit is reached, images are replaced with text placeholders
   * that retain context about what the image contained.
   *
   * @param content Array of content parts
   * @param currentImageCount Current number of images already in history
   * @returns Filtered content with limited images or placeholders for omitted images
   */
  private limitImagesInContent(
    content: ChatCompletionContentPart[],
    currentImageCount: number,
  ): ChatCompletionContentPart[] {
    if (!Array.isArray(content) || this.maxImagesCount === undefined) {
      return content;
    }

    const remainingImageQuota = Math.max(0, this.maxImagesCount - currentImageCount);

    if (remainingImageQuota <= 0) {
      // Filter out all images if quota is exhausted
      return content.filter((part) => !(typeof part === 'object' && part.type === 'image_url'));
    }

    // Count images as we process content
    let imagesAdded = 0;
    const result: ChatCompletionContentPart[] = [];

    for (const part of content) {
      if (typeof part === 'object' && part.type === 'image_url') {
        if (imagesAdded < remainingImageQuota) {
          result.push(part);
          imagesAdded++;
        } else {
          // Skip this image but add placeholder text if possible
          result.push({
            type: 'text',
            text: '[Image omitted to conserve context]',
          });
        }
      } else {
        // Non-image content is always included
        result.push(part);
      }
    }

    return result;
  }
}
