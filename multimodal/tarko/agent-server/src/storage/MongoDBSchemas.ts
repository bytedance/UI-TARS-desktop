/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Schema, model, Document } from 'mongoose';
import { SessionInfo, AgentEventStream } from '@tarko/interface';

/**
 * Session document interface for MongoDB
 */
export interface SessionDocument extends Document {
  _id: string; // Use string _id to match SQLite behavior
  createdAt: number;
  updatedAt: number;
  workspace: string;
  metadata?: SessionInfo['metadata'];
}

/**
 * Event document interface for MongoDB
 */
export interface EventDocument extends Document {
  sessionId: string;
  timestamp: number;
  eventData: AgentEventStream.Event;
}

/**
 * Session schema definition
 */
const sessionSchema = new Schema<SessionDocument>(
  {
    _id: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Number,
      required: true,
      index: true,
    },
    updatedAt: {
      type: Number,
      required: true,
      index: true,
    },
    workspace: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
  },
  {
    _id: false, // Disable automatic _id generation since we provide our own
    versionKey: false, // Disable __v version key
    collection: 'sessions',
  },
);

/**
 * Event schema definition
 */
const eventSchema = new Schema<EventDocument>(
  {
    sessionId: {
      type: String,
      required: true,
      ref: 'Session',
      index: true,
    },
    timestamp: {
      type: Number,
      required: true,
      index: true,
    },
    eventData: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    versionKey: false, // Disable __v version key
    collection: 'events',
  },
);

// Compound index for efficient event queries
eventSchema.index({ sessionId: 1, timestamp: 1 });

// Index for session ordering
sessionSchema.index({ updatedAt: -1 });

/**
 * Session model
 */
export const SessionModel = model<SessionDocument>('Session', sessionSchema);

/**
 * Event model
 */
export const EventModel = model<EventDocument>('Event', eventSchema);
