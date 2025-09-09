/**
 * Transformer for converting agent trace JSONL to AgentEventStream events
 *
 * This transformer converts OpenTelemetry-style span events from agent_trace.jsonl
 * into the AgentEventStream protocol format for visualization.
 */

// Import types - these would normally come from the actual packages
// For this example, we'll define the types inline

// Simplified types for the example
interface ChatCompletionMessageToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Simplified AgentEventStream namespace
namespace AgentEventStream {
  export interface BaseEvent {
    id: string;
    type: string;
    timestamp: number;
  }

  export interface UserMessageEvent extends BaseEvent {
    type: 'user_message';
    content: string | any[];
  }

  export interface AssistantMessageEvent extends BaseEvent {
    type: 'assistant_message';
    content: string;
    rawContent?: string;
    toolCalls?: ChatCompletionMessageToolCall[];
    finishReason?: string;
    ttftMs?: number;
    ttltMs?: number;
    messageId?: string;
  }

  export interface AssistantThinkingMessageEvent extends BaseEvent {
    type: 'assistant_thinking_message';
    content: string;
    isComplete?: boolean;
    thinkingDurationMs?: number;
    messageId?: string;
  }

  export interface ToolCallEvent extends BaseEvent {
    type: 'tool_call';
    toolCallId: string;
    name: string;
    arguments: Record<string, any>;
    startTime: number;
    tool: {
      name: string;
      description: string;
      schema: any;
    };
  }

  export interface ToolResultEvent extends BaseEvent {
    type: 'tool_result';
    toolCallId: string;
    name: string;
    content: any;
    elapsedMs: number;
    error?: string;
  }

  export interface AgentRunStartEvent extends BaseEvent {
    type: 'agent_run_start';
    sessionId: string;
    runOptions: {
      maxIterations?: number;
      timeoutMs?: number;
    };
    provider?: string;
    model?: string;
    modelDisplayName?: string;
    agentName?: string;
  }

  export interface AgentRunEndEvent extends BaseEvent {
    type: 'agent_run_end';
    sessionId: string;
    iterations: number;
    elapsedMs: number;
    status: string;
  }

  export type Event =
    | UserMessageEvent
    | AssistantMessageEvent
    | AssistantThinkingMessageEvent
    | ToolCallEvent
    | ToolResultEvent
    | AgentRunStartEvent
    | AgentRunEndEvent;
}
import { v4 as uuidv4 } from 'uuid';

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
      const toolCallId = uuidv4();

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
 * Main transformer class
 */
export class AgentTraceTransformer {
  private spans = new Map<string, SpanState>();
  private toolCalls = new Map<string, ToolCallState>();
  private events: AgentEventStream.Event[] = [];
  private sessionId = uuidv4();
  private messageIdCounter = 0;

  /**
   * Transform a line of JSONL data
   */
  transformLine(line: string): void {
    if (!line.trim()) return;

    try {
      const event: SourceEvent = JSON.parse(line);
      this.processSourceEvent(event);
    } catch (error) {
      console.error('Error parsing line:', error);
    }
  }

  /**
   * Process a single source event
   */
  private processSourceEvent(event: SourceEvent): void {
    const { type, span_id, name } = event;

    switch (type) {
      case 'START':
        this.handleStart(event);
        break;
      case 'UPDATE':
        this.handleUpdate(event);
        break;
      case 'END':
        this.handleEnd(event);
        break;
    }
  }

  /**
   * Handle START events
   */
  private handleStart(event: SourceEvent): void {
    const span: SpanState = {
      spanId: event.span_id,
      name: event.name,
      parentSpanId: event.parent_span_id,
      startTime: event.time_unix_nano,
      attributes: event.attributes,
    };

    this.spans.set(event.span_id, span);

    // Handle agent_step start as agent_run_start
    if (event.name === 'agent_step' && event.attributes?.step === 1) {
      this.createAgentRunStartEvent(event);
    }
  }

  /**
   * Handle UPDATE events - these contain the actual data
   */
  private handleUpdate(event: SourceEvent): void {
    const span = this.spans.get(event.span_id);
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
        this.handleLLMUpdate(event, span);
        break;
      case 'parse_tool_calls':
        this.handleToolCallParse(event, span);
        break;
      case 'portal.run_action':
      case 'execute_bash':
      case 'str_replace_editor':
      case 'think':
        this.handleToolResult(event, span);
        break;
    }
  }

  /**
   * Handle END events
   */
  private handleEnd(event: SourceEvent): void {
    const span = this.spans.get(event.span_id);
    if (!span) return;

    span.endTime = event.time_unix_nano;

    // Handle agent_step end as agent_run_end
    if (span.name === 'agent_step' && !span.parentSpanId) {
      this.createAgentRunEndEvent(event, span);
    }
  }

  /**
   * Handle LLM output updates
   */
  private handleLLMUpdate(event: SourceEvent, span: SpanState): void {
    const outputs = span.outputs;
    if (!outputs?.content) return;

    const content = outputs.content;
    const messageId = this.generateMessageId();
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

        this.events.push({
          id: uuidv4(),
          type: 'assistant_thinking_message',
          timestamp,
          content: thinkingContent,
          isComplete: true,
          messageId,
        });
      }
    } else {
      // Parse function calls from content
      const { cleanContent, toolCalls } = FunctionCallParser.parseContent(content);

      // Create assistant message event
      const assistantEvent: AgentEventStream.AssistantMessageEvent = {
        id: uuidv4(),
        type: 'assistant_message',
        timestamp,
        content: cleanContent,
        rawContent: content,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        finishReason: outputs.openai?.choices?.[0]?.finish_reason,
        messageId,
      };

      // Add usage info if available
      if (outputs.openai?.usage) {
        const usage = outputs.openai.usage;
        assistantEvent.ttftMs = undefined; // Not available in source data
        assistantEvent.ttltMs = undefined; // Not available in source data
      }

      this.events.push(assistantEvent);

      // Store tool calls for later correlation
      toolCalls.forEach((toolCall) => {
        this.toolCalls.set(toolCall.id, {
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
  private handleToolCallParse(event: SourceEvent, span: SpanState): void {
    const outputs = span.outputs;
    if (!Array.isArray(outputs) || outputs.length === 0) return;

    const toolCallData = outputs[0];
    if (!toolCallData.tool?.name) return;

    const toolCallId = uuidv4();
    const timestamp = Math.floor(event.time_unix_nano / 1000000);

    // Create tool call event
    const toolCallEvent: AgentEventStream.ToolCallEvent = {
      id: uuidv4(),
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

    this.events.push(toolCallEvent);

    // Store for result correlation
    this.toolCalls.set(toolCallId, {
      toolCallId,
      toolName: toolCallData.tool.name,
      arguments: toolCallData.params || {},
      startTime: event.time_unix_nano,
    });
  }

  /**
   * Handle tool execution result updates
   */
  private handleToolResult(event: SourceEvent, span: SpanState): void {
    const outputs = span.outputs;
    if (!outputs) return;

    // Find corresponding tool call
    const toolCall = Array.from(this.toolCalls.values()).find(
      (tc) =>
        tc.toolName === span.name ||
        (span.name === 'portal.run_action' && tc.resultSpanId === span.spanId),
    );

    if (!toolCall && span.name !== 'portal.run_action') {
      // For portal.run_action, we might not have a direct match, so create a generic one
      return;
    }

    const toolCallId = toolCall?.toolCallId || uuidv4();
    const timestamp = Math.floor(event.time_unix_nano / 1000000);
    const startTime = toolCall?.startTime ? Math.floor(toolCall.startTime / 1000000) : timestamp;
    const elapsedMs = timestamp - startTime;

    // Extract result content
    let content: any;
    let error: string | undefined;

    if (outputs.result) {
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
      id: uuidv4(),
      type: 'tool_result',
      timestamp,
      toolCallId,
      name: toolCall?.toolName || span.name || 'unknown',
      content,
      elapsedMs,
      error,
    };

    this.events.push(toolResultEvent);

    // Mark tool call as having a result
    if (toolCall) {
      toolCall.resultSpanId = span.spanId;
    }
  }

  /**
   * Create agent run start event
   */
  private createAgentRunStartEvent(event: SourceEvent): void {
    const timestamp = Math.floor(event.time_unix_nano / 1000000);

    const agentRunStartEvent: AgentEventStream.AgentRunStartEvent = {
      id: uuidv4(),
      type: 'agent_run_start',
      timestamp,
      sessionId: this.sessionId,
      runOptions: {
        maxIterations: 100,
        timeoutMs: 300000,
      },
      provider: 'openai',
      model: 'gpt-4',
      modelDisplayName: 'GPT-4',
      agentName: 'Agent',
    };

    this.events.push(agentRunStartEvent);
  }

  /**
   * Create agent run end event
   */
  private createAgentRunEndEvent(event: SourceEvent, span: SpanState): void {
    const timestamp = Math.floor(event.time_unix_nano / 1000000);
    const startTime = Math.floor(span.startTime / 1000000);
    const elapsedMs = timestamp - startTime;

    const agentRunEndEvent: AgentEventStream.AgentRunEndEvent = {
      id: uuidv4(),
      type: 'agent_run_end',
      timestamp,
      sessionId: this.sessionId,
      iterations: 1,
      elapsedMs,
      status: 'completed',
    };

    this.events.push(agentRunEndEvent);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${++this.messageIdCounter}`;
  }

  /**
   * Get all transformed events
   */
  getEvents(): AgentEventStream.Event[] {
    return this.events.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear all state
   */
  reset(): void {
    this.spans.clear();
    this.toolCalls.clear();
    this.events = [];
    this.sessionId = uuidv4();
    this.messageIdCounter = 0;
  }
}

/**
 * Transform agent trace JSONL file to AgentEventStream events
 */
export function transformAgentTrace(jsonlContent: string): AgentEventStream.Event[] {
  const transformer = new AgentTraceTransformer();

  const lines = jsonlContent.split('\n');
  for (const line of lines) {
    transformer.transformLine(line);
  }

  return transformer.getEvents();
}

/**
 * Transform agent trace JSONL file to AgentEventStream events (async)
 */
export async function transformAgentTraceAsync(
  jsonlContent: string,
): Promise<AgentEventStream.Event[]> {
  return transformAgentTrace(jsonlContent);
}

// Export the AgentEventStream namespace for use in other files
export { AgentEventStream };
