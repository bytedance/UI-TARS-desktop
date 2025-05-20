import { Event, EventType } from '@multimodal/agent';
import type { AgentIntermediateState, AgentStep } from '../types/chat';

/**
 * Event processor for handling Agent TARS event stream
 * Maps server events to UI state updates
 */
export class EventStreamProcessor {
  /**
   * Process a stream event into intermediate UI state
   * @param event The event from the agent event stream
   * @returns Intermediate state for UI rendering
   */
  processEvent(event: Event): AgentIntermediateState | null {
    // Process different event types
    switch (event.type) {
      case EventType.ASSISTANT_THINKING_MESSAGE:
        return {
          type: 'thinking',
          content: event.content,
        };

      case EventType.ASSISTANT_STREAMING_THINKING_MESSAGE:
        return {
          type: 'thinking',
          content: event.content,
        };

      case EventType.TOOL_CALL:
        return this.processToolCall(event);

      case EventType.TOOL_RESULT:
        return this.processToolResult(event);

      case EventType.SYSTEM:
        return {
          type: 'system',
          content: event.message,
        };

      default:
        return null;
    }
  }

  /**
   * Process tool call events to update steps
   */
  private processToolCall(event: any): AgentIntermediateState {
    // Create a step for the tool call
    const step: AgentStep = {
      id: parseInt(event.toolCallId) || Date.now(),
      title: event.name,
      description: JSON.stringify(event.arguments).slice(0, 100),
      status: 'in-progress',
      artifactId: event.toolCallId,
    };

    return {
      type: 'steps',
      content: `Executing tool: ${event.name}`,
      steps: [step],
    };
  }

  /**
   * Process tool result events to update steps
   */
  private processToolResult(event: any): AgentIntermediateState {
    // Create a completed step
    const step: AgentStep = {
      id: parseInt(event.toolCallId) || Date.now(),
      title: event.name,
      description:
        event.error ||
        (typeof event.content === 'string'
          ? event.content.slice(0, 100)
          : JSON.stringify(event.content).slice(0, 100)),
      status: event.error ? 'pending' : 'completed',
      artifactId: event.toolCallId,
    };

    return {
      type: 'steps',
      content: event.error
        ? `Error in tool execution: ${event.name}`
        : `Completed tool: ${event.name}`,
      steps: [step],
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
}

// Export singleton instance
export const eventProcessor = new EventStreamProcessor();
