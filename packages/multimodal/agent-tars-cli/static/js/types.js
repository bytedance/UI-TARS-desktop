/**
 * @typedef {Object} ContentPart
 * @property {string} type - The content type, either 'text' or 'image_url'
 * @property {string} [text] - Text content, present when type is 'text'
 * @property {Object} [image_url] - Image information, present when type is 'image_url'
 * @property {string} [image_url.url] - The image URL, which could be a data URL or a regular URL
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} toolCallId - Unique identifier for this tool call
 * @property {string} name - Name of the tool being called
 * @property {Object|string} arguments - The arguments passed to the tool
 */

/**
 * @typedef {Object} ToolResult
 * @property {string} toolCallId - Unique identifier for the tool call this result corresponds to
 * @property {string} name - Name of the tool
 * @property {*} content - The content returned by the tool
 * @property {string} [error] - Error message, if the tool call failed
 */

/**
 * @typedef {Object} AgentEvent
 * @property {string} type - Event type
 * @property {Object} [data] - Event data
 * @property {string} [data.text] - Text content for events that have text
 * @property {string} [id] - Event ID
 * @property {number} [timestamp] - Event timestamp
 * @property {string} [content] - Content for streaming events
 * @property {boolean} [isComplete] - Whether the streaming event is complete
 * @property {ContentPart[]} [content] - Multimodal content parts
 * @property {ToolCall[]} [toolCalls] - Tool calls for events that have them
 */

/**
 * @typedef {Object} StreamingMessage
 * @property {HTMLElement} element - The DOM element for the message
 * @property {boolean} isMultimodal - Whether this message contains multimodal content
 */

/**
 * @typedef {Object} SessionInfo
 * @property {string} sessionId - The current session ID
 * @property {boolean} isProcessing - Whether the agent is currently processing
 * @property {StreamingMessage|null} currentStreamingMessage - The current streaming message being displayed
 */

export {};
