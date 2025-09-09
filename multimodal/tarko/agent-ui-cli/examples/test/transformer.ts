/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';
import { defineTransformer } from '@tarko/agent-ui-cli';
import type { ChatCompletionMessageToolCall } from '@tarko/model-provider/types';

/**
 * Source event structure from agent_trace.jsonl
 */
interface SourceEvent {
  type: 'START' | 'UPDATE' | 'END';
  span_id: string;
  time_unix_nano: number;
  parent_span_id?: string;
  trace_id?: string;
  name?: string;
  attributes?: {
    step?: number;
    inputs?: {
      messages?: Array<{
        role: string;
        content: string;
      }>;
      model?: any;
      kwargs?: any;
    };
    outputs?: any;
    hostname?: string;
    process_id?: number;
    thread_id?: number;
    task_id?: number;
  };
  events?: any;
  status?: {
    code: string;
    message: any;
  };
}

/**
 * Input format: array of source events from JSONL
 */
interface AgentTraceFormat {
  events: SourceEvent[];
}

/**
 * Span state for tracking multi-event spans
 */
interface SpanState {
  spanId: string;
  name?: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes?: any;
  outputs?: any;
  inputs?: any;
  status?: any;
  processed?: boolean; // Flag to prevent duplicate processing
}

/**
 * Tool call state for tracking tool execution lifecycle
 */
interface ToolCallState {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, any>;
  startTime: number;
  resultSpanId?: string;
}

/**
 * Function call parser for extracting tool calls from text
 */
class FunctionCallParser {
  private static readonly FUNCTION_CALL_REGEX = /<function=([^>]+)>\s*([\s\S]*?)<\/function>/g;
  private static readonly PARAMETER_REGEX = /<parameter=([^>]+)>([\s\S]*?)<\/parameter>/g;

  static parseContent(content: string): {
    cleanContent: string;
    toolCalls: ChatCompletionMessageToolCall[];
  } {
    const toolCalls: ChatCompletionMessageToolCall[] = [];
    let cleanContent = content;
    let match;

    // Reset regex lastIndex
    this.FUNCTION_CALL_REGEX.lastIndex = 0;

    while ((match = this.FUNCTION_CALL_REGEX.exec(content)) !== null) {
      const toolName = match[1];
      const parameterBlock = match[2];
      const toolCallId = `tool-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Parse parameters
      const parameters: Record<string, any> = {};
      this.PARAMETER_REGEX.lastIndex = 0;
      let paramMatch;

      while ((paramMatch = this.PARAMETER_REGEX.exec(parameterBlock)) !== null) {
        const paramName = paramMatch[1];
        const paramValue = paramMatch[2].trim();
        parameters[paramName] = paramValue;
      }

      toolCalls.push({
        id: toolCallId,
        type: 'function',
        function: {
          name: toolName,
          arguments: JSON.stringify(parameters),
        },
      });

      // Remove function call from content
      cleanContent = cleanContent.replace(match[0], '').trim();
    }

    return { cleanContent, toolCalls };
  }
}

/**
 * Agent trace transformer that converts OpenTelemetry-style span events
 * from agent_trace.jsonl into AgentEventStream format
 */
export default defineTransformer<AgentTraceFormat>((input) => {
  const events: AgentEventStream.Event[] = [];
  const spans = new Map<string, SpanState>();
  const toolCallsMap = new Map<string, ToolCallState>();
  let eventIdCounter = 1;
  let messageIdCounter = 0;
  const sessionId = `session-${Date.now()}`;
  let currentLoopToolCalls: ChatCompletionMessageToolCall[] = [];

  // Helper function to generate unique IDs
  const generateId = () => `event-${eventIdCounter++}`;
  const generateMessageId = () => `msg-${++messageIdCounter}`;

  // Process each source event
  for (const sourceEvent of input.events) {
    const { type, span_id, name } = sourceEvent;

    switch (type) {
      case 'START':
        handleStart(sourceEvent);
        break;
      case 'UPDATE':
        handleUpdate(sourceEvent);
        break;
      case 'END':
        handleEnd(sourceEvent);
        break;
    }
  }

  /**
   * Handle START events
   */
  function handleStart(event: SourceEvent): void {
    const span: SpanState = {
      spanId: event.span_id,
      name: event.name,
      parentSpanId: event.parent_span_id,
      startTime: event.time_unix_nano,
      attributes: event.attributes,
    };

    spans.set(event.span_id, span);

    // Handle agent_step start as agent_run_start
    if (event.name === 'agent_step' && event.attributes?.step === 1) {
      createAgentRunStartEvent(event);
    }
  }

  /**
   * Handle UPDATE events - these contain the actual data
   */
  function handleUpdate(event: SourceEvent): void {
    const span = spans.get(event.span_id);
    if (!span) return;

    // Update span with outputs
    if (event.attributes?.outputs) {
      span.outputs = event.attributes.outputs;
    }
    if (event.attributes?.inputs) {
      span.inputs = event.attributes.inputs;
    }

    // Process based on span name
    switch (span.name) {
      case 'llm':
        handleLLMUpdate(event, span);
        break;
      case 'parse_tool_calls':
        handleToolCallParse(event, span);
        break;
      case 'portal.run_action':
      case 'execute_bash':
      case 'str_replace_editor':
      case 'think':
        handleToolResult(event, span);
        break;
    }
  }

  /**
   * Handle END events
   */
  function handleEnd(event: SourceEvent): void {
    const span = spans.get(event.span_id);
    if (!span) return;

    span.endTime = event.time_unix_nano;

    // Handle agent_step end as agent_run_end
    if (span.name === 'agent_step' && !span.parentSpanId) {
      createAgentRunEndEvent(event, span);
    }
  }

  /**
   * Handle LLM output updates
   */
  function handleLLMUpdate(event: SourceEvent, span: SpanState): void {
    const outputs = span.outputs;
    if (!outputs?.content || span.processed) return;

    // Mark span as processed to prevent duplicate events
    span.processed = true;

    const content = outputs.content;
    const messageId = generateMessageId();
    const timestamp = Math.floor(event.time_unix_nano / 1000000);

    // Check if this is a thinking message (from 'think' tool)
    const isThinking = content.includes('<function=think>');

    if (isThinking) {
      // Extract thinking content
      const { cleanContent, toolCalls } = FunctionCallParser.parseContent(content);

      // Create thinking message event
      if (toolCalls.length > 0 && toolCalls[0].function.name === 'think') {
        const thinkingArgs = JSON.parse(toolCalls[0].function.arguments);
        const thinkingContent = thinkingArgs.content || cleanContent;

        events.push({
          id: generateId(),
          type: 'assistant_thinking_message',
          timestamp,
          content: thinkingContent,
          isComplete: true,
          messageId,
        } as AgentEventStream.AssistantThinkingMessageEvent);
      }
    } else {
      // Parse function calls from content
      const { cleanContent, toolCalls } = FunctionCallParser.parseContent(content);

      // Collect tool calls for current loop
      currentLoopToolCalls = [...toolCalls];

      // Create assistant message event
      const assistantEvent: AgentEventStream.AssistantMessageEvent = {
        id: generateId(),
        type: 'assistant_message',
        timestamp,
        content: cleanContent,
        rawContent: content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason:
          toolCalls.length > 0
            ? 'tool_calls'
            : outputs.openai?.choices?.[0]?.finish_reason || 'stop',
        messageId,
      };

      events.push(assistantEvent);

      // Store tool calls for later correlation
      toolCalls.forEach((toolCall) => {
        toolCallsMap.set(toolCall.id, {
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
          startTime: event.time_unix_nano,
        });
      });
    }
  }

  /**
   * Handle tool call parsing updates
   */
  function handleToolCallParse(event: SourceEvent, span: SpanState): void {
    const outputs = span.outputs;
    if (!Array.isArray(outputs) || outputs.length === 0 || span.processed) return;

    // Mark span as processed to prevent duplicate events
    span.processed = true;

    const toolCallData = outputs[0];
    if (!toolCallData.tool?.name) return;

    // Find matching tool call from current loop
    const matchingToolCall = currentLoopToolCalls.find(
      (tc) => tc.function.name === toolCallData.tool.name,
    );

    const toolCallId = matchingToolCall?.id || `tool-call-${eventIdCounter}`;
    const timestamp = Math.floor(event.time_unix_nano / 1000000);

    // Create tool call event
    const toolCallEvent: AgentEventStream.ToolCallEvent = {
      id: generateId(),
      type: 'tool_call',
      timestamp,
      toolCallId,
      name: toolCallData.tool.name,
      arguments: toolCallData.params || {},
      startTime: timestamp,
      tool: {
        name: toolCallData.tool.name,
        description: `Tool: ${toolCallData.tool.name}`,
        schema: {},
      },
    };

    events.push(toolCallEvent);

    // Store for result correlation
    toolCallsMap.set(toolCallId, {
      toolCallId,
      toolName: toolCallData.tool.name,
      arguments: toolCallData.params || {},
      startTime: event.time_unix_nano,
    });
  }

  /**
   * Handle tool execution result updates
   */
  function handleToolResult(event: SourceEvent, span: SpanState): void {
    const outputs = span.outputs;
    if (!outputs || span.processed) return;

    // Mark span as processed to prevent duplicate events
    span.processed = true;

    // Find corresponding tool call by matching tool names
    // The tool call name from parse_tool_calls should match the execution span name
    const toolCall = Array.from(toolCallsMap.values()).find((tc) => {
      // Direct name match
      if (tc.toolName === span.name) return true;

      // Handle special cases where names might differ
      if (span.name === 'portal.run_action' && tc.resultSpanId === span.spanId) return true;

      // Handle cases where tool call might have been created with different naming
      if (span.name === 'execute_bash' && tc.toolName === 'execute_bash') return true;
      if (span.name === 'str_replace_editor' && tc.toolName === 'str_replace_editor') return true;
      if (span.name === 'think' && tc.toolName === 'think') return true;

      return false;
    });

    // If no tool call found, try to find the most recent unmatched tool call
    let finalToolCall = toolCall;
    if (!finalToolCall) {
      const unmatchedToolCalls = Array.from(toolCallsMap.values()).filter((tc) => !tc.resultSpanId);

      // Find by name similarity or take the most recent one
      finalToolCall =
        unmatchedToolCalls.find((tc) => tc.toolName === span.name) ||
        unmatchedToolCalls[unmatchedToolCalls.length - 1];
    }

    const toolCallId = finalToolCall?.toolCallId || `tool-call-${span.spanId}`;
    const timestamp = Math.floor(event.time_unix_nano / 1000000);
    const startTime = finalToolCall?.startTime
      ? Math.floor(finalToolCall.startTime / 1000000)
      : timestamp;
    const elapsedMs = timestamp - startTime;

    // Extract result content based on the output structure
    let content: any;
    let error: string | undefined;

    if (outputs.output) {
      // Standard tool output format
      content = outputs.output;
      if (outputs.meta) {
        content = { output: outputs.output, meta: outputs.meta };
      }
    } else if (outputs.result) {
      content = outputs.result;
    } else if (outputs.data) {
      content = outputs.data;
      if (outputs.data.status === 'Failed' || outputs.data.return_code !== 0) {
        error = outputs.data.stderr || 'Tool execution failed';
      }
    } else {
      content = outputs;
    }

    // Create tool result event
    const toolResultEvent: AgentEventStream.ToolResultEvent = {
      id: generateId(),
      type: 'tool_result',
      timestamp,
      toolCallId,
      name: finalToolCall?.toolName || span.name || 'unknown',
      content,
      elapsedMs,
      error,
    };

    events.push(toolResultEvent);

    // Mark tool call as having a result
    if (finalToolCall) {
      finalToolCall.resultSpanId = span.spanId;
    }
  }

  /**
   * Create agent run start event
   */
  function createAgentRunStartEvent(event: SourceEvent): void {
    const timestamp = Math.floor(event.time_unix_nano / 1000000);

    const agentRunStartEvent: AgentEventStream.AgentRunStartEvent = {
      id: generateId(),
      type: 'agent_run_start',
      timestamp,
      sessionId: sessionId,
      runOptions: {
        maxIterations: 100,
        timeoutMs: 300000,
      },
      provider: 'openai',
      model: 'gpt-4',
      modelDisplayName: 'GPT-4',
      agentName: 'Agent',
    };

    events.push(agentRunStartEvent);
  }

  /**
   * Create agent run end event
   */
  function createAgentRunEndEvent(event: SourceEvent, span: SpanState): void {
    const timestamp = Math.floor(event.time_unix_nano / 1000000);
    const startTime = Math.floor(span.startTime / 1000000);
    const elapsedMs = timestamp - startTime;

    const agentRunEndEvent: AgentEventStream.AgentRunEndEvent = {
      id: generateId(),
      type: 'agent_run_end',
      timestamp,
      sessionId: sessionId,
      iterations: 1,
      elapsedMs,
      status: 'completed',
    };

    events.push(agentRunEndEvent);
  }

  // Sort events by timestamp and return
  return {
    events: events.sort((a, b) => a.timestamp - b.timestamp),
  };
});
