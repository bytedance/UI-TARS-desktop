/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream, AgentProcessingPhase, AgentStatusInfo } from '@tarko/interface';

/**
 * Implement event stream bridging to forward Agent's native events to the client
 */
export class EventStreamBridge {
  private subscribers: Set<(type: string, data: any) => void> = new Set();

  /**
   * Subscribe to events
   * @param handler event processing function
   */
  subscribe(handler: (type: string, data: any) => void): void {
    this.subscribers.add(handler);
  }

  /**
   * Unsubscribe event
   * @param handler event processing function
   */
  unsubscribe(handler: (type: string, data: any) => void): void {
    this.subscribers.delete(handler);
  }

  /**
   * Publish event
   * @param type event type
   * @param data event data
   */
  emit(type: string, data: any): void {
    for (const handler of this.subscribers) {
      handler(type, data);
    }
  }

  /**
   * Event stream manager connected to Agent
   * @param agentEventStream Agent's event stream manager
   * @returns Unsubscribe function
   */
  connectToAgentEventStream(agentEventStream: AgentEventStream.Processor): () => void {
    const handleEvent = (event: AgentEventStream.Event) => {
      // Mapping event types to socket.io-friendly events
      switch (event.type) {
        case 'agent_run_start':
          // Enhanced TTFT status with detailed state
          this.emit('agent-status', {
            isProcessing: true,
            state: 'initializing',
            phase: 'model_initialization' as AgentProcessingPhase,
            message: 'Initializing model and processing request...',
          } as AgentStatusInfo);
          break;

        case 'agent_run_end':
          // 确保明确发送完成状态
          this.emit('agent-status', { isProcessing: false, state: event.status || 'idle' });
          break;

        case 'user_message':
          // Enhanced TTFT phase tracking
          this.emit('agent-status', {
            isProcessing: true,
            state: 'processing',
            phase: 'request_processing' as AgentProcessingPhase,
            message: 'Processing your request...',
          } as AgentStatusInfo);
          this.emit('query', { text: event.content });
          break;
        case 'assistant_message':
          this.emit('answer', { text: event.content });
          break;
        case 'assistant_streaming_message':
          // First token received - TTFT milestone reached
          if (!event.isComplete) {
            this.emit('agent-status', {
              isProcessing: true,
              state: 'streaming',
              phase: 'first_token_received' as AgentProcessingPhase,
              message: 'Generating response...',
            } as AgentStatusInfo);
          }
          this.emit('streaming_message', {
            content: event.content,
            isComplete: event.isComplete,
            messageId: event.messageId,
          });
          break;
        case 'tool_call':
          this.emit('agent-status', {
            isProcessing: true,
            state: 'executing_tools',
            phase: 'tool_execution' as AgentProcessingPhase,
            message: `Executing ${event.name}...`,
          } as AgentStatusInfo);
          this.emit('event', {
            type: 'tool_call',
            name: event.name,
            toolCallId: event.toolCallId,
            arguments: event.arguments,
          });
          break;
        case 'tool_result':
          this.emit('event', {
            type: 'tool_result',
            name: event.name,
            toolCallId: event.toolCallId,
            content: event.content,
            error: event.error,
          });
          break;
        case 'system':
          // Enhanced system event handling for TTFT phases
          if (event.message?.includes('model warming up')) {
            this.emit('agent-status', {
              isProcessing: true,
              state: 'warming_up',
              phase: 'model_warmup' as AgentProcessingPhase,
              message: 'Warming up model...',
            } as AgentStatusInfo);
          } else if (event.message?.includes('generating')) {
            this.emit('agent-status', {
              isProcessing: true,
              state: 'generating',
              phase: 'response_generation' as AgentProcessingPhase,
              message: 'Generating response...',
            } as AgentStatusInfo);
          }
          this.emit(event.level, { message: event.message });
          break;
        default:
          this.emit('event', event);
      }

      if (event.type === 'system' && event.message?.includes('aborted')) {
        this.emit('aborted', { message: event.message });
        this.emit('agent-status', { isProcessing: false, state: 'idle' });
      }

      // Add handling for status events
      if (event.type === 'system' && event.message?.includes('status')) {
        this.emit('status', { message: event.message });
      }
    };

    // Subscribe to the Agent's event stream
    return agentEventStream.subscribe(handleEvent);
  }
}
