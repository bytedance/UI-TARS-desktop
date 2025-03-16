/**
 * The following code is modified based on
 * https://github.com/nanobrowser/nanobrowser/blob/master/chrome-extension/src/background/agent/event/manager.ts
 *
 * Apache-2.0 License
 * Copyright (c) 2024 alexchenzl
 * https://github.com/nanobrowser/nanobrowser/blob/master/LICENSE
 */
import type { AgentEvent, EventType, EventCallback } from './types';
import { createLogger } from '../../utils';

const logger = createLogger('event-manager');

export class EventManager {
  private _subscribers: Map<EventType, EventCallback[]>;

  constructor() {
    this._subscribers = new Map();
  }

  subscribe(eventType: EventType, callback: EventCallback): void {
    if (!this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, []);
    }

    const callbacks = this._subscribers.get(eventType);
    if (callbacks && !callbacks.includes(callback)) {
      callbacks.push(callback);
    }
  }

  unsubscribe(eventType: EventType, callback: EventCallback): void {
    if (this._subscribers.has(eventType)) {
      const callbacks = this._subscribers.get(eventType);
      if (callbacks) {
        this._subscribers.set(
          eventType,
          callbacks.filter((cb) => cb !== callback),
        );
      }
    }
  }

  clearSubscribers(eventType: EventType): void {
    if (this._subscribers.has(eventType)) {
      this._subscribers.set(eventType, []);
    }
  }

  async emit(event: AgentEvent): Promise<void> {
    const callbacks = this._subscribers.get(event.type);
    if (callbacks) {
      try {
        await Promise.all(
          callbacks.map(async (callback) => await callback(event)),
        );
      } catch (error) {
        logger.error('Error executing event callbacks:', error);
      }
    }
  }
}
