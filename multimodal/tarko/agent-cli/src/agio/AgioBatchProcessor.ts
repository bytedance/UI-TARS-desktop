/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgioEvent } from '@tarko/agio';

/**
 * Options for configuring the AgioBatchProcessor.
 */
export interface AgioBatchProcessorOptions {
  /**
   * The URL of the AGIO provider endpoint.
   */
  providerUrl: string;
  /**
   * The maximum number of events to buffer before sending a batch.
   * @default 20
   */
  maxBatchSize?: number;
  /**
   * The maximum time in milliseconds to wait before sending a batch.
   * @default 5000
   */
  flushInterval?: number;
  /**
   * The timeout for the fetch request in milliseconds.
   * @default 5000
   */
  requestTimeout?: number;
}

/**
 * AgioBatchProcessor handles batching and sending of AGIO events.
 *
 * It collects events in a buffer and sends them periodically or when the
 * buffer reaches a certain size, improving performance by reducing the number of
 * HTTP requests.
 */
export class AgioBatchProcessor {
  private readonly providerUrl: string;
  private readonly maxBatchSize: number;
  private readonly flushInterval: number;
  private readonly requestTimeout: number;

  private eventBuffer: AgioEvent.ExtendedEvent[] = [];
  private timer: NodeJS.Timeout | null = null;

  constructor(options: AgioBatchProcessorOptions) {
    this.providerUrl = options.providerUrl;
    this.maxBatchSize = options.maxBatchSize ?? 20;
    this.flushInterval = options.flushInterval ?? 5000;
    this.requestTimeout = options.requestTimeout ?? 5000;
  }

  /**
   * Adds an event to the buffer.
   * If the buffer reaches maxBatchSize, it will be flushed immediately.
   * @param event The AGIO event to add.
   */
  public addEvent(event: AgioEvent.ExtendedEvent): void {
    this.eventBuffer.push(event);
    if (this.eventBuffer.length >= this.maxBatchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Manually triggers a flush of the event buffer.
   * This is useful for ensuring all events are sent, e.g., on application shutdown.
   */
  public async flush(): Promise<void> {
    this.clearScheduledFlush();

    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      /**
       * The provider endpoint is designed to accept an array of events
       * in a single request under the `events` key. This batching mechanism
       * is crucial for performance in high-throughput environments.
       */
      const response = await fetch(this.providerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      // ignore the errors.
    }
  }

  /**
   * Schedules a flush if one isn't already scheduled.
   */
  private scheduleFlush(): void {
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  /**
   * Clears any scheduled flush.
   */
  private clearScheduledFlush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
