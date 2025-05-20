import {
  addSystemMessage,
  addAssistantMessage,
  addToolCall,
  addToolResult,
  updateOrAddThinking,
} from './ui.js';
import { handleStreamingMessage } from './messageHandler.js';
import { getSessionInfo, setProcessingState } from './main.js';

/**
 * Handles events from the agent
 *
 * @param {import('./types.js').AgentEvent} event - The event to handle
 */
export function handleAgentEvent(event) {
  console.log('Agent event:', event);
  const sessionInfo = getSessionInfo();

  switch (event.type) {
    case 'ready':
      addSystemMessage('Agent is ready');
      setProcessingState(false);
      break;

    case 'query':
      // Don't add user message here to avoid duplication
      // The message is already added in sendQuery()
      setProcessingState(true);
      break;

    case 'answer':
      addAssistantMessage(event.data.text);
      setProcessingState(false);
      break;

    case 'assistant_streaming_message':
      handleStreamingMessage(event);
      break;

    case 'thinking':
    case 'assistant_thinking_message':
    case 'assistant_streaming_thinking_message':
      updateOrAddThinking(event.data || event.content);
      break;

    case 'tool_call':
      addToolCall(event);
      break;

    case 'tool_result':
      addToolResult(event);
      break;

    case 'error':
      addSystemMessage(`Error: ${event.data?.message || 'Unknown error'}`);
      setProcessingState(false);
      break;

    case 'closed':
      addSystemMessage('Session closed');
      setProcessingState(false);
      break;
  }
}
