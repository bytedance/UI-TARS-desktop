import { EventHandler } from './types';
import { AgentEventStream } from '@/common/types';

// Import all handlers
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

import { PlanStartHandler, PlanUpdateHandler, PlanFinishHandler } from './handlers/PlanHandler';

import { SystemMessageHandler, EnvironmentInputHandler } from './handlers/SystemHandler';

import { FinalAnswerHandler, FinalAnswerStreamingHandler } from './handlers/FinalAnswerHandler';

import { AgentRunStartHandler, AgentRunEndHandler } from './handlers/AgentRunHandler';

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

    // Plan handlers
    this.register(new PlanStartHandler());
    this.register(new PlanUpdateHandler());
    this.register(new PlanFinishHandler());

    // System handlers
    this.register(new SystemMessageHandler());
    this.register(new EnvironmentInputHandler());

    // Final answer handlers
    this.register(new FinalAnswerHandler());
    this.register(new FinalAnswerStreamingHandler());

    // Agent run handlers
    this.register(new AgentRunStartHandler());
    this.register(new AgentRunEndHandler());
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
   * Get all registered handlers
   */
  getAllHandlers(): readonly EventHandler[] {
    return [...this.handlers];
  }
}

// Export singleton instance
export const eventHandlerRegistry = new EventHandlerRegistry();
