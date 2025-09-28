/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentEventStream } from '@tarko/interface';

/**
 * Event Data Access Object interface
 * Provides abstraction for event data operations
 */
export interface IEventDAO {
  /**
   * Save an event to a session
   */
  saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void>;

  /**
   * Get all events for a session
   */
  getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]>;

  /**
   * Get events for a session within a time range
   */
  getSessionEventsInRange(
    sessionId: string,
    startTime: number,
    endTime: number,
  ): Promise<AgentEventStream.Event[]>;

  /**
   * Get events for a session with pagination
   */
  getSessionEventsPaginated(
    sessionId: string,
    offset: number,
    limit: number,
  ): Promise<AgentEventStream.Event[]>;

  /**
   * Delete all events for a session
   */
  deleteSessionEvents(sessionId: string): Promise<number>;

  /**
   * Get event count for a session
   */
  getSessionEventCount(sessionId: string): Promise<number>;

  /**
   * Delete events older than specified timestamp
   */
  deleteEventsOlderThan(timestamp: number): Promise<number>;
}