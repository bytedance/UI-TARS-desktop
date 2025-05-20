import { sendQuery } from './main.js';

/**
 * DOM element references
 */
const elements = {
  promptInput: null,
  sendButton: null,
  chatContainer: null,
  eventsContainer: null,
  connectionStatus: null,
  clearChatButton: null,
  clearEventsButton: null,
};

/**
 * Initializes UI elements and event listeners
 */
export function initializeUI() {
  // Get DOM elements
  elements.promptInput = document.getElementById('prompt-input');
  elements.sendButton = document.getElementById('send-button');
  elements.chatContainer = document.getElementById('chat-container');
  elements.eventsContainer = document.getElementById('events-container');
  elements.connectionStatus = document.getElementById('connection-status');
  elements.clearChatButton = document.getElementById('clear-chat-button');
  elements.clearEventsButton = document.getElementById('clear-events-button');

  // Add event listeners
  elements.sendButton.addEventListener('click', sendQuery);

  elements.promptInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      sendQuery();
    }
  });

  elements.clearChatButton.addEventListener('click', clearChat);
  elements.clearEventsButton.addEventListener('click', clearEvents);
}

/**
 * Updates the connection status indicator
 *
 * @param {boolean} connected - Whether we're connected to the server
 */
export function updateConnectionStatus(connected) {
  if (!elements.connectionStatus) return;

  elements.connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
  elements.connectionStatus.className = `status-indicator ${connected ? 'connected-status' : 'disconnected-status'}`;
  elements.sendButton.disabled = !connected;
}

/**
 * Updates the UI to reflect processing state
 *
 * @param {boolean} isProcessing - Whether the agent is processing a request
 */
export function updateProcessingState(isProcessing) {
  if (!elements.sendButton) return;
  elements.sendButton.disabled = isProcessing;
}

/**
 * Adds a system message to the chat
 *
 * @param {string} text - The message text
 */
export function addSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system-message';
  messageDiv.textContent = text;
  elements.chatContainer.appendChild(messageDiv);
  scrollToBottom(elements.chatContainer);
}

/**
 * Adds a user message to the chat
 *
 * @param {string} text - The message text
 */
export function addUserMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user-message';
  messageDiv.textContent = text;
  elements.chatContainer.appendChild(messageDiv);
  scrollToBottom(elements.chatContainer);
}

/**
 * Adds an assistant message to the chat
 *
 * @param {string} text - The message text
 * @param {HTMLElement|null} existingMessageElement - Optional existing message element to update
 * @returns {HTMLElement} - The message element
 */
export function addAssistantMessage(text, existingMessageElement = null) {
  let messageDiv = existingMessageElement;

  // If no existing element provided, create a new one
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant-message';
    elements.chatContainer.appendChild(messageDiv);
  }

  // Update text content
  messageDiv.textContent = text;
  messageDiv.classList.remove('streaming-response');

  scrollToBottom(elements.chatContainer);
  return messageDiv;
}

/**
 * Creates a new streaming message container
 *
 * @param {boolean} isMultimodal - Whether this will contain multimodal content
 * @returns {import('./types.js').StreamingMessage} - The streaming message object
 */
export function createStreamingMessage(isMultimodal = false) {
  const element = document.createElement('div');
  element.className = `message assistant-message streaming-response ${isMultimodal ? 'multimodal-content' : ''}`;
  elements.chatContainer.appendChild(element);

  scrollToBottom(elements.chatContainer);

  return {
    element,
    isMultimodal,
  };
}

/**
 * Adds or updates thinking output
 *
 * @param {string|Object} content - The thinking content
 */
export function updateOrAddThinking(content) {
  if (!content) return;

  let thinkingContent =
    typeof content === 'string' ? content : content.content || JSON.stringify(content);

  let thinkingDiv = document.getElementById('thinking-container');

  if (!thinkingDiv) {
    thinkingDiv = document.createElement('div');
    thinkingDiv.id = 'thinking-container';
    thinkingDiv.className = 'thinking-container';
    elements.chatContainer.appendChild(thinkingDiv);
  }

  thinkingDiv.textContent = 'Thinking: ' + thinkingContent;
  scrollToBottom(elements.chatContainer);
}

/**
 * Adds a tool call event to the chat
 *
 * @param {import('./types.js').AgentEvent} event - The tool call event
 */
export function addToolCall(event) {
  const toolData = event.data || event;
  const toolDiv = document.createElement('div');
  toolDiv.className = 'event-log tool-call-item';
  toolDiv.innerHTML = `<strong>Tool Call:</strong> ${toolData.name || toolData.toolCallId}`;

  if (toolData.arguments) {
    const argsText =
      typeof toolData.arguments === 'object'
        ? JSON.stringify(toolData.arguments, null, 2)
        : toolData.arguments;

    toolDiv.innerHTML += `<pre>${argsText}</pre>`;
  }

  elements.chatContainer.appendChild(toolDiv);
  scrollToBottom(elements.chatContainer);
}

/**
 * Adds a tool result event to the chat
 *
 * @param {import('./types.js').AgentEvent} event - The tool result event
 */
export function addToolResult(event) {
  const resultData = event.data || event;
  const resultDiv = document.createElement('div');
  resultDiv.className = 'event-log tool-call-item';

  // Style differently if there was an error
  if (resultData.error) {
    resultDiv.innerHTML = `<strong>Tool Error (${resultData.name || resultData.toolCallId}):</strong> ${resultData.error}`;
    resultDiv.style.borderLeftColor = '#f44336';
  } else {
    resultDiv.innerHTML = `<strong>Tool Result (${resultData.name || resultData.toolCallId}):</strong>`;

    // Handle content based on type
    const content = resultData.content;

    // Handle image content specially
    if (content && content.type === 'image' && content.data) {
      const imgContainer = document.createElement('div');
      imgContainer.className = 'image-container';
      const img = document.createElement('img');
      img.src = `data:${content.mimeType || 'image/png'};base64,${content.data}`;
      img.className = 'image-preview';
      imgContainer.appendChild(img);
      resultDiv.appendChild(imgContainer);
    } else {
      // Add content as preformatted text
      const contentText =
        typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);

      const pre = document.createElement('pre');
      pre.textContent = contentText;
      resultDiv.appendChild(pre);
    }
  }

  elements.chatContainer.appendChild(resultDiv);
  scrollToBottom(elements.chatContainer);
}

/**
 * Clears the chat container
 */
export function clearChat() {
  elements.chatContainer.innerHTML = '';
  addSystemMessage('Chat cleared');
}

/**
 * Clears the events container
 */
export function clearEvents() {
  elements.eventsContainer.innerHTML = '';
}

/**
 * Gets the current value of the prompt input
 *
 * @returns {string} - The current prompt input value
 */
export function getPromptInput() {
  return elements.promptInput ? elements.promptInput.value.trim() : '';
}

/**
 * Clears the prompt input
 */
export function clearPromptInput() {
  if (elements.promptInput) {
    elements.promptInput.value = '';
  }
}

/**
 * Scrolls to the bottom of a container
 *
 * @param {HTMLElement} container - The container to scroll
 */
export function scrollToBottom(container) {
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Gets the chat container element
 *
 * @returns {HTMLElement|null} - The chat container element
 */
export function getChatContainer() {
  return elements.chatContainer;
}

/**
 * Gets the events container element
 *
 * @returns {HTMLElement|null} - The events container element
 */
export function getEventsContainer() {
  return elements.eventsContainer;
}
