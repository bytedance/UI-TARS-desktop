import {
  scrollToBottom,
  createStreamingMessage,
  getChatContainer,
  getEventsContainer,
} from './ui.js';
import { getSessionInfo } from './main.js';

/**
 * Logs an event to the events panel
 *
 * @param {import('./types.js').AgentEvent} event - The event to log
 */
export function logEvent(event) {
  const eventsContainer = getEventsContainer();
  if (!eventsContainer) return;

  const eventItem = document.createElement('div');
  eventItem.className = `event-item event-${event.type}`;

  // Add timestamp
  const time = new Date().toLocaleTimeString();
  const timeEl = document.createElement('div');
  timeEl.className = 'event-time';
  timeEl.textContent = time;
  eventItem.appendChild(timeEl);

  // Add type
  const typeEl = document.createElement('div');
  typeEl.className = 'event-type';
  typeEl.textContent = event.type;
  eventItem.appendChild(typeEl);

  // Add data in pretty format
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(event, null, 2);
  eventItem.appendChild(pre);

  eventsContainer.appendChild(eventItem);
  scrollToBottom(eventsContainer);
}

/**
 * Handles streaming messages, updating the UI with each chunk
 *
 * @param {import('./types.js').AgentEvent} event - The streaming message event
 */
export function handleStreamingMessage(event) {
  const sessionInfo = getSessionInfo();
  const chatContainer = getChatContainer();

  // Handle multimodal content array
  if (Array.isArray(event.content)) {
    // If this is the first streaming chunk, create a new message container
    if (!sessionInfo.currentStreamingMessage) {
      sessionInfo.currentStreamingMessage = createStreamingMessage(true);
    }

    const msgElement = sessionInfo.currentStreamingMessage.element;

    // Process each content part
    event.content.forEach((part) => {
      if (part.type === 'text') {
        // Add text content
        const textElement = document.createElement('p');
        textElement.textContent = part.text;
        msgElement.appendChild(textElement);
      } else if (part.type === 'image_url' && part.image_url) {
        // Handle image content
        const imageUrl = part.image_url.url;
        if (imageUrl && imageUrl.startsWith('data:image/')) {
          const imageElement = document.createElement('img');
          imageElement.className = 'image-preview';
          imageElement.src = imageUrl;
          msgElement.appendChild(imageElement);
        }
      }
    });
  }
  // Handle simple text content
  else {
    // If this is the first streaming chunk, create a new message element
    if (!sessionInfo.currentStreamingMessage) {
      sessionInfo.currentStreamingMessage = createStreamingMessage(false);
      sessionInfo.currentStreamingMessage.element.textContent = '';
    }

    // Append content to the streaming message
    if (event.content) {
      sessionInfo.currentStreamingMessage.element.textContent += event.content;
    } else if (event.data && event.data.text) {
      sessionInfo.currentStreamingMessage.element.textContent += event.data.text;
    }
  }

  // If complete, remove streaming animation
  if (event.isComplete && sessionInfo.currentStreamingMessage) {
    sessionInfo.currentStreamingMessage.element.classList.remove('streaming-response');
  }

  scrollToBottom(chatContainer);
}

/**
 * Process a streaming HTTP response using fetch API and SSE
 *
 * @param {Response} response - The response object from fetch
 * @returns {Promise<void>}
 */
export async function handleStreamingResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Create initial streaming message container
  const sessionInfo = getSessionInfo();
  if (!sessionInfo.currentStreamingMessage) {
    sessionInfo.currentStreamingMessage = createStreamingMessage();
  }

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process any complete events in buffer
      const events = buffer.split('\n\n');
      buffer = events.pop() || ''; // Last chunk might be incomplete

      for (const eventText of events) {
        if (eventText.trim() && eventText.startsWith('data: ')) {
          try {
            const eventData = JSON.parse(eventText.substring(6));
            // Log to events panel
            logEvent(eventData);
            // Process for chat
            import('./events.js').then((module) => {
              module.handleAgentEvent(eventData);
            });
          } catch (e) {
            console.error('Error parsing event:', e, eventText);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading stream:', error);
  } finally {
    // Final decode
    if (buffer) {
      decoder.decode();
    }

    // Mark streaming as complete
    if (sessionInfo.currentStreamingMessage) {
      sessionInfo.currentStreamingMessage.element.classList.remove('streaming-response');
    }
  }
}
