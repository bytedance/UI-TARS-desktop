/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Agent,
  Event,
  EventType,
  AssistantStreamingMessageEvent,
  AssistantStreamingThinkingMessageEvent,
} from '@multimodal/agent';
import { CodeHighlighter } from './highlighter';
import { logger } from './logger';

/**
 * LLM output logger for CodeActAgent
 *
 * This class handles displaying LLM responses and thinking process in the console
 * with proper formatting and highlighting.
 */
export class LLMLogger {
  private agent: Agent;
  private enabled: boolean;
  private streamBuffer = '';
  private isStreaming = false;

  /**
   * Create a new LLM logger
   *
   * @param agent The agent to monitor for events
   * @param enabled Whether to enable console output
   */
  constructor(agent: Agent, enabled = false) {
    this.agent = agent;
    this.enabled = enabled;
  }

  /**
   * Initialize the logger and subscribe to agent events
   */
  initialize(): void {
    if (!this.enabled) return;

    const eventStream = this.agent.getEventStream();

    // Subscribe to relevant event types
    eventStream.subscribeToTypes(
      [
        EventType.ASSISTANT_MESSAGE,
        EventType.ASSISTANT_THINKING_MESSAGE,
        EventType.ASSISTANT_STREAMING_MESSAGE,
        EventType.ASSISTANT_STREAMING_THINKING_MESSAGE,
      ],
      (event) => this.handleEvent(event),
    );

    logger.info('LLM Logger initialized and subscribed to agent events');
  }

  /**
   * Handle an event from the agent
   *
   * @param event The event to process
   */
  private handleEvent(event: Event): void {
    if (!this.enabled) return;

    switch (event.type) {
      case EventType.ASSISTANT_MESSAGE:
        // this.printMessage(event.content as string);
        break;

      case EventType.ASSISTANT_THINKING_MESSAGE:
        this.printThinking(event.content as string);
        break;

      case EventType.ASSISTANT_STREAMING_MESSAGE:
        this.handleStreamingMessage(event);
        break;

      case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
        this.handleStreamingThinking(event);
        break;
    }
  }

  /**
   * Handle streaming LLM message
   *
   * @param event The streaming event
   */
  private handleStreamingMessage(event: AssistantStreamingMessageEvent): void {
    // Start new stream if this is the first chunk
    if (!this.isStreaming) {
      this.isStreaming = true;
      this.streamBuffer = '';
    }

    // Add content to buffer
    if (typeof event.content === 'string') {
      this.streamBuffer += event.content;

      // If this is the last chunk, print complete message
      if (event.isComplete) {
        this.isStreaming = false;
        this.printMessage(this.streamBuffer, 'LLM RESPONSE');
        this.streamBuffer = '';
      }
    }
  }

  /**
   * Handle streaming thinking message
   *
   * @param event The streaming thinking event
   */
  private handleStreamingThinking(event: AssistantStreamingThinkingMessageEvent): void {
    // Start new stream if this is the first chunk
    if (!this.isStreaming) {
      this.isStreaming = true;
      this.streamBuffer = '';
    }

    // Add content to buffer
    if (typeof event.content === 'string') {
      this.streamBuffer += event.content;

      // If this is the last chunk, print complete thinking
      if (event.isComplete) {
        this.isStreaming = false;
        this.printThinking(this.streamBuffer, 'LLM THINKING');
        this.streamBuffer = '';
      }
    }
  }

  /**
   * Print a regular LLM message
   *
   * @param content The message content
   * @param label Optional label for the output
   */
  private printMessage(content: string, label = 'LLM RESPONSE'): void {
    console.log(CodeHighlighter.highlightLLMOutput(content, label));
  }

  /**
   * Print a thinking/reasoning message
   *
   * @param content The thinking content
   * @param label Optional label for the output
   */
  private printThinking(content: string, label = 'LLM THINKING'): void {
    console.log(CodeHighlighter.highlightLLMOutput(content, label));
  }
}
