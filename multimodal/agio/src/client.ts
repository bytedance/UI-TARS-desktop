/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent, AgioEventType, AgioEventPayload } from './types';
import { AgioConfig } from './config';

/**
 * Client for sending Agio events to configured endpoints
 */
export class AgioClient {
  private endpoint: string | null = null;
  private enabled = false;
  private sessionId: string;
  private bufferSize: number;
  private eventBuffer: AgioEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly DEFAULT_FLUSH_INTERVAL_MS = 10000; // 10 seconds

  /**
   * Create a new Agio client
   *
   * @param config The Agio configuration
   * @param sessionId The session identifier
   */
  constructor(
    private config: AgioConfig,
    sessionId?: string,
  ) {
    this.endpoint = config.endpoint ?? null;
    this.enabled = !!this.endpoint && config.enabled !== false;
    this.sessionId =
      sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.bufferSize = config.bufferSize || 10;

    // Set up automatic flushing if enabled
    if (this.enabled && config.autoFlush !== false) {
      const flushIntervalMs = config.flushIntervalMs || this.DEFAULT_FLUSH_INTERVAL_MS;
      this.flushInterval = setInterval(() => this.flush(), flushIntervalMs);
    }
  }

  /**
   * Create and send an event
   *
   * @param type The event type
   * @param data The event data
   * @returns The created event
   */
  send<T extends AgioEventType>(
    type: T,
    data: Omit<AgioEventPayload<T>, 'type' | 'timestamp' | 'sessionId'>,
  ): AgioEventPayload<T> {
    // Create the event
    const event = {
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...data,
    } as AgioEventPayload<T>;

    // If not enabled, just return the event without sending
    if (!this.enabled) {
      return event;
    }

    // Add to buffer
    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.bufferSize) {
      this.flush();
    }

    return event;
  }

  /**
   * Set the session ID
   *
   * @param sessionId The new session ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Flush events from buffer to endpoint
   *
   * @returns Promise that resolves when flush is complete
   */
  async flush(): Promise<void> {
    if (!this.enabled || this.eventBuffer.length === 0 || !this.endpoint) {
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Process events with any configured transformers
      const processedEvents = this.config.transformer
        ? (events.map(this.config.transformer).filter(Boolean) as AgioEvent[])
        : events;

      if (processedEvents.length === 0) {
        return;
      }

      // Send events to endpoint
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.headers || {}),
        },
        body: JSON.stringify({
          events: processedEvents,
          client: this.config.clientId || 'agio-client',
        }),
      });
    } catch (error) {
      // Silently fail if sending fails
      // Optionally log if debug is enabled
      if (this.config.debug) {
        console.error('Failed to send Agio events:', error);
      }

      // If configured to retry, add events back to buffer
      if (this.config.retryOnFailure) {
        this.eventBuffer = [...events, ...this.eventBuffer];
        // Limit buffer size to prevent memory issues
        if (this.eventBuffer.length > this.config.maxBufferSize || 100) {
          this.eventBuffer = this.eventBuffer.slice(-this.config.maxBufferSize || -100);
        }
      }
    }
  }

  /**
   * Check if Agio client is enabled
   *
   * @returns True if client is enabled and will send events
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable the Agio client
   *
   * @param enabled Whether to enable the client
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled && !!this.endpoint;
  }

  /**
   * Set the endpoint URL
   *
   * @param endpoint The new endpoint URL
   */
  setEndpoint(endpoint: string | null): void {
    this.endpoint = endpoint;
    this.enabled = !!endpoint && this.config.enabled !== false;
  }

  /**
   * Clean up resources used by the client
   */
  cleanup(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush any remaining events
    this.flush();
  }
}
