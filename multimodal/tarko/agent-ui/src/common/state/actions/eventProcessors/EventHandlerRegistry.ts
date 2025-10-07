import { EventHandler } from './types';
import { AgentEventStream } from '@/common/types';
import { isEventStreamViewerEnabled } from '@/config/web-ui-config';
import {
  UserMessageHandler,
  AssistantMessageHandler,
  StreamingMessageHandler,
  ThinkingMessageHandler,
} from './handlers/MessageHandler';

import {
  ToolCallHandler,
  ToolResultHandler,
  StreamingToolCallHandler,
} from './handlers/ToolHandler';

import { SystemMessageHandler, EnvironmentInputHandler } from './handlers/SystemHandler';

import { AgentRunStartHandler, AgentRunEndHandler } from './handlers/AgentRunHandler';

import { RawEventsHandler } from './handlers/RawEventsHandler';

/**
 * Event handler registry manages all event handlers
 */
export class EventHandlerRegistry {
  private handlers: EventHandler[] = [];

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Register all default event handlers
   */
  private registerDefaultHandlers(): void {
    // Message handlers
    this.register(new UserMessageHandler());
    this.register(new AssistantMessageHandler());
    this.register(new StreamingMessageHandler());
    this.register(new ThinkingMessageHandler());

    // Tool handlers
    this.register(new ToolCallHandler());
    this.register(new ToolResultHandler());
    this.register(new StreamingToolCallHandler());

    // System handlers
    this.register(new SystemMessageHandler());
    this.register(new EnvironmentInputHandler());

    // Agent run handlers
    this.register(new AgentRunStartHandler());
    this.register(new AgentRunEndHandler());

    // Raw events handler (only register if event stream viewer is enabled)
    if (isEventStreamViewerEnabled()) {
      this.register(new RawEventsHandler());
    }
  }

  /**
   * Register a new event handler
   */
  register(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Find the appropriate handler for an event
   */
  findHandler(event: AgentEventStream.Event): EventHandler | null {
    return this.handlers.find((handler) => handler.canHandle(event)) || null;
  }

  /**
   * Find all handlers that can handle an event
   */
  findAllHandlers(event: AgentEventStream.Event): EventHandler[] {
    return this.handlers.filter((handler) => handler.canHandle(event));
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): readonly EventHandler[] {
    return [...this.handlers];
  }
}

// Export singleton instance
export const eventHandlerRegistry = new EventHandlerRegistry();
