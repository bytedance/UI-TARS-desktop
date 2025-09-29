/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IAgent,
  AgentStatus,
  AgentEventStream,
  AgentRunOptions,
  AgentAppConfig,
} from '@tarko/interface';
import { EventEmitter } from 'events';

/**
 * Mock Agent implementation for testing
 */
export class MockAgent implements IAgent {
  private eventStream: MockEventStream;
  private currentStatus: AgentStatus = AgentStatus.IDLE;
  private isAborted = false;

  constructor(private options: AgentAppConfig) {
    this.eventStream = new MockEventStream(options.initialEvents);
  }

  async initialize(): Promise<void> {
    this.currentStatus = AgentStatus.READY;
  }

  async run(options: AgentRunOptions): Promise<any> {
    if (this.isAborted) {
      throw new Error('Agent was aborted');
    }

    this.currentStatus = AgentStatus.EXECUTING;

    // Emit some test events

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (options.stream) {
      return this.createMockStream();
    }

    this.currentStatus = AgentStatus.READY;
    return { success: true, message: 'Mock response' };
  }

  private async *createMockStream(): AsyncIterable<AgentEventStream.Event> {
    yield this.eventStream.createEvent('system', {
      level: 'info',
      message: 'Mock streaming started',
    });

    yield this.eventStream.createEvent('assistant_message', {
      content: 'Mock streaming response',
    });

    this.currentStatus = AgentStatus.READY;
  }

  abort(): boolean {
    if (this.currentStatus === AgentStatus.EXECUTING) {
      this.isAborted = true;
      this.currentStatus = AgentStatus.READY;
      return true;
    }
    return false;
  }

  status(): AgentStatus {
    return this.currentStatus;
  }

  getEventStream(): AgentEventStream.Processor {
    return this.eventStream;
  }

  async generateSummary(options: any): Promise<any> {
    return { summary: 'Mock summary' };
  }

  async dispose(): Promise<void> {
    this.currentStatus = AgentStatus.IDLE;
    this.eventStream.removeAllListeners();
  }

  // Additional required methods from IAgent interface
  getTools(): any[] {
    return [];
  }

  getOptions(): AgentAppConfig {
    return this.options;
  }


}

/**
 * Mock EventStream implementation
 */
class MockEventStream extends EventEmitter implements AgentEventStream.Processor {
  private events: AgentEventStream.Event[] = [];

  constructor(initialEvents?: AgentEventStream.Event[]) {
    super();
    if (initialEvents && initialEvents.length > 0) {
      this.events = [...initialEvents];
      console.info(`[MockEventStream] Initialized with ${initialEvents.length} initial events`);
    }
  }

  subscribe(handler: (event: AgentEventStream.Event) => void): () => void {
    this.on('event', handler);
    return () => this.off('event', handler);
  }

  sendEvent(event: AgentEventStream.Event): void {
    this.events.push(event);
    super.emit('event', event);
  }

  getEvents(): AgentEventStream.Event[] {
    return [...this.events];
  }

  getEventsByType(types: AgentEventStream.EventType[]): AgentEventStream.Event[] {
    return this.events.filter(event => types.includes(event.type));
  }



  dispose(): void {
    this.events = [];
    this.removeAllListeners();
  }

  createEvent(type: AgentEventStream.EventType, data: any): AgentEventStream.Event {
    return {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      timestamp: new Date().toISOString(),
      ...data,
    } as AgentEventStream.Event;
  }


}
