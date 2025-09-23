/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Connection, Model } from 'mongoose';
import { AgentEventStream } from '@tarko/interface';
import { IEventDAO } from '../interfaces/IEventDAO';
import { EventDocument } from './MongoDBSchemas';
import { getLogger } from '../../utils/logger';

const logger = getLogger('EventDAO');

/**
 * MongoDB implementation of IEventDAO
 */
export class EventDAO implements IEventDAO {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  private getEventModel(): Model<EventDocument> {
    return this.connection.model<EventDocument>('Event');
  }

  async saveEvent(sessionId: string, event: AgentEventStream.Event): Promise<void> {
    try {
      const EventModel = this.getEventModel();
      const timestamp = Date.now();

      const eventDoc = new EventModel({
        sessionId,
        timestamp,
        eventData: event,
      });

      await eventDoc.save();
      logger.debug(`Event saved for session: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to save event for session ${sessionId}:`, error);
      throw new Error(
        `Failed to save event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionEvents(sessionId: string): Promise<AgentEventStream.Event[]> {
    try {
      const EventModel = this.getEventModel();

      const events = await EventModel.find({ sessionId }).sort({ timestamp: 1, _id: 1 }).lean();

      return events.map((event: EventDocument) => {
        try {
          return event.eventData;
        } catch (error) {
          logger.error(`Failed to parse event data: ${JSON.stringify(event.eventData)}`);
          return {
            type: 'system',
            message: 'Failed to parse event data',
            timestamp: Date.now(),
          } as AgentEventStream.Event;
        }
      });
    } catch (error) {
      logger.error(`Failed to get events for session ${sessionId}:`, error);
      return [];
    }
  }

  async getSessionEventsInRange(
    sessionId: string,
    startTime: number,
    endTime: number,
  ): Promise<AgentEventStream.Event[]> {
    try {
      const EventModel = this.getEventModel();

      const events = await EventModel.find({
        sessionId,
        timestamp: { $gte: startTime, $lte: endTime },
      }).sort({ timestamp: 1, _id: 1 }).lean();

      return events.map((event: EventDocument) => {
        try {
          return event.eventData;
        } catch (error) {
          logger.error(`Failed to parse event data: ${JSON.stringify(event.eventData)}`);
          return {
            type: 'system',
            message: 'Failed to parse event data',
            timestamp: Date.now(),
          } as AgentEventStream.Event;
        }
      });
    } catch (error) {
      logger.error(`Failed to get events in range for session ${sessionId}:`, error);
      return [];
    }
  }

  async getSessionEventsPaginated(
    sessionId: string,
    offset: number,
    limit: number,
  ): Promise<AgentEventStream.Event[]> {
    try {
      const EventModel = this.getEventModel();

      const events = await EventModel.find({ sessionId })
        .sort({ timestamp: 1, _id: 1 })
        .skip(offset)
        .limit(limit)
        .lean();

      return events.map((event: EventDocument) => {
        try {
          return event.eventData;
        } catch (error) {
          logger.error(`Failed to parse event data: ${JSON.stringify(event.eventData)}`);
          return {
            type: 'system',
            message: 'Failed to parse event data',
            timestamp: Date.now(),
          } as AgentEventStream.Event;
        }
      });
    } catch (error) {
      logger.error(`Failed to get paginated events for session ${sessionId}:`, error);
      return [];
    }
  }

  async deleteSessionEvents(sessionId: string): Promise<number> {
    try {
      const EventModel = this.getEventModel();
      const result = await EventModel.deleteMany({ sessionId });
      logger.info(`Deleted ${result.deletedCount} events for session: ${sessionId}`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error(`Failed to delete events for session ${sessionId}:`, error);
      throw new Error(
        `Failed to delete session events: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getSessionEventCount(sessionId: string): Promise<number> {
    try {
      const EventModel = this.getEventModel();
      const count = await EventModel.countDocuments({ sessionId });
      return count;
    } catch (error) {
      logger.error(`Failed to get event count for session ${sessionId}:`, error);
      throw new Error(
        `Failed to get event count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteEventsOlderThan(timestamp: number): Promise<number> {
    try {
      const EventModel = this.getEventModel();
      const result = await EventModel.deleteMany({ timestamp: { $lt: timestamp } });
      logger.info(`Deleted ${result.deletedCount} events older than ${timestamp}`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error(`Failed to delete old events:`, error);
      throw new Error(
        `Failed to delete old events: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}