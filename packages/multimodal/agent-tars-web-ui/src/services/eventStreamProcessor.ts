import { Event, EventType } from '@multimodal/agent-interface';
import type {
  AgentIntermediateState,
  AgentStep,
  ToolCallMessage,
  ToolResultMessage,
} from '../types/chat';

/**
 * Event processor for handling Agent TARS event stream
 * Maps server events to UI state updates
 */
export class EventStreamProcessor {
  private toolSteps: Map<string, AgentStep> = new Map();

  /**
   * Process a stream event into intermediate UI state
   * @param event The event from the agent event stream
   * @returns Intermediate state for UI rendering
   */
  processEvent(event: Event): AgentIntermediateState | null {
    // Process different event types
    switch (event.type) {
      case EventType.ASSISTANT_THINKING_MESSAGE:
      case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
        return {
          type: 'thinking',
          content:
            typeof event.content === 'string' ? event.content : JSON.stringify(event.content),
        };

      case EventType.TOOL_CALL:
        return this.processToolCall(event);

      case EventType.TOOL_RESULT:
        return this.processToolResult(event);

      case EventType.SYSTEM:
        return {
          type: 'system',
          content: event.message || 'System notification',
        };

      // 处理错误事件
      case 'error':
        return {
          type: 'error',
          content: event.message || 'An error occurred',
        };

      default:
        return null;
    }
  }

  /**
   * Creates a tool call message from an event
   * @param event Tool call event
   * @returns Tool call message
   */
  createToolCallMessage(event: any): ToolCallMessage {
    return {
      id: event.id || `tool-call-${Date.now()}`,
      role: 'assistant',
      type: 'tool_call',
      toolCallId: event.toolCallId || event.id,
      name: event.name || 'unknown',
      arguments: event.arguments || {},
      content: `Calling tool: ${event.name}`,
      timestamp: event.timestamp || Date.now(),
    };
  }

  /**
   * Creates a tool result message from an event
   * @param event Tool result event
   * @returns Tool result message
   */
  createToolResultMessage(event: any): ToolResultMessage {
    return {
      id: event.id || `tool-result-${Date.now()}`,
      role: 'assistant',
      type: 'tool_result',
      toolCallId: event.toolCallId || event.id,
      name: event.name || 'unknown',
      content: event.content || 'No content',
      error: event.error,
      timestamp: event.timestamp || Date.now(),
    };
  }

  /**
   * Process tool call events to update steps
   */
  private processToolCall(event: any): AgentIntermediateState {
    // Create a step for the tool call
    const stepId = parseInt(event.toolCallId) || Date.now();
    const step: AgentStep = {
      id: stepId,
      title: event.name || 'Tool Call',
      description:
        typeof event.arguments === 'object'
          ? JSON.stringify(event.arguments).slice(0, 100)
          : String(event.arguments || '').slice(0, 100),
      status: 'in-progress',
      artifactId: event.toolCallId || String(stepId),
    };

    // Store step for later reference
    this.toolSteps.set(step.artifactId, step);

    return {
      type: 'steps',
      content: `Executing tool: ${event.name || 'Unknown Tool'}`,
      steps: [step],
    };
  }

  /**
   * Process tool result events to update steps
   */
  private processToolResult(event: any): AgentIntermediateState {
    const toolCallId = event.toolCallId || '';
    let step: AgentStep;

    // Try to find existing step
    if (this.toolSteps.has(toolCallId)) {
      step = { ...this.toolSteps.get(toolCallId)! };
      step.status = event.error ? 'pending' : 'completed';

      // Update step description with result summary
      if (!event.error) {
        step.description =
          typeof event.content === 'string'
            ? event.content.slice(0, 100)
            : JSON.stringify(event.content).slice(0, 100);
      }
    } else {
      // Create new step if not found
      step = {
        id: parseInt(toolCallId) || Date.now(),
        title: event.name || 'Tool Result',
        description:
          event.error ||
          (typeof event.content === 'string'
            ? event.content.slice(0, 100)
            : JSON.stringify(event.content).slice(0, 100)),
        status: event.error ? 'pending' : 'completed',
        artifactId: toolCallId || `artifact-${Date.now()}`,
      };
    }

    // Store updated step
    this.toolSteps.set(step.artifactId, step);

    // Add block for visualization
    const canvasState = this.generateCanvasContent(event.name || 'Tool Result', event.content);

    return {
      type: 'steps',
      content: event.error
        ? `Error in tool execution: ${event.name || 'Unknown Tool'}`
        : `Completed tool: ${event.name || 'Unknown Tool'}`,
      steps: [step],
      blocks: canvasState?.blocks,
    };
  }

  /**
   * Generate canvas content from tool result data
   * @param toolName Tool name that generated the content
   * @param content Tool result content
   * @returns Canvas blocks if content can be visualized
   */
  generateCanvasContent(toolName: string, content: any): AgentIntermediateState | null {
    // Skip if content is not appropriate for visualization
    if (!content || (typeof content === 'string' && content.length < 20)) {
      return null;
    }

    // Generate a unique ID for the block
    const blockId = `block-${Date.now()}`;

    // Determine content type and format for visualization
    let blockType = 'text';
    let formattedContent = '';

    if (typeof content === 'object') {
      // JSON content
      blockType = 'code';
      formattedContent = JSON.stringify(content, null, 2);
    } else if (typeof content === 'string') {
      // Try to detect content type
      if (content.trim().startsWith('<')) {
        // HTML content
        blockType = 'website';
        formattedContent = content;
      } else if (
        content.includes('function') ||
        content.includes('class') ||
        content.includes('import') ||
        content.includes('export')
      ) {
        // Probably code
        blockType = 'code';
        formattedContent = content;
      } else {
        // Default to documentation
        blockType = 'documentation';
        formattedContent = `<div>${content}</div>`;
      }
    }

    return {
      type: 'canvas',
      content: `Visualizing ${toolName} results`,
      blocks: [
        {
          id: blockId,
          type: blockType,
          title: `${toolName} Results`,
          content: formattedContent,
        },
      ],
    };
  }

  /**
   * Reset the processor state (e.g., when starting a new conversation)
   */
  reset(): void {
    this.toolSteps.clear();
  }
}

// Export singleton instance
export const eventProcessor = new EventStreamProcessor();
