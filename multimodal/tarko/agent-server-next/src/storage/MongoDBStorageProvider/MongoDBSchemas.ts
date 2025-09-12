/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Schema, model, Document } from 'mongoose';
import { AgentEventStream, SessionInfo } from '@tarko/interface';

/**
 * Session document interface for MongoDB
 */
export interface SessionDocument extends Document {
  _id: string; // Use string _id to match SQLite behavior
  createdAt: number;
  updatedAt: number;
  workspace: string;
  userId?: string; // For multi-tenant support
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
 * User configuration document interface for MongoDB
 */
export interface UserConfigDocument extends Document {
  userId: string;
  createdAt: number;
  updatedAt: number;
  config: {
    sandboxAllocationStrategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';
    sandboxPoolQuota: number;
    sharedLinks: string[];
    customSpFragments: string[];
    modelProviders: Array<{
      name: string;
      baseURL?: string;
      models: string[];
    }>;
  };
}

/**
 * Sandbox allocation document interface for MongoDB
 */
export interface SandboxAllocationDocument extends Document {
  sandboxId: string;
  sandboxUrl: string;
  userId?: string;
  sessionId?: string;
  allocationStrategy: 'Shared-Pool' | 'User-Exclusive' | 'Session-Exclusive';
  createdAt: number;
  lastUsedAt: number;
  isActive: boolean;
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
    userId: {
      type: String,
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

/**
 * User configuration schema definition
 */
const userConfigSchema = new Schema<UserConfigDocument>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    config: {
      type: Schema.Types.Mixed,
      required: true,
      default: {
        sandboxAllocationStrategy: 'Shared-Pool',
        sandboxPoolQuota: 5,
        sharedLinks: [],
        customSpFragments: [],
        modelProviders: [],
      },
    },
  },
  {
    versionKey: false,
    collection: 'userConfigs',
  },
);

/**
 * Sandbox allocation schema definition
 */
const sandboxAllocationSchema = new Schema<SandboxAllocationDocument>(
  {
    sandboxId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sandboxUrl: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    allocationStrategy: {
      type: String,
      required: true,
      enum: ['Shared-Pool', 'User-Exclusive', 'Session-Exclusive'],
      index: true,
    },
    createdAt: {
      type: Number,
      required: true,
      index: true,
    },
    lastUsedAt: {
      type: Number,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
  },
  {
    versionKey: false,
    collection: 'sandboxAllocations',
  },
);

// Compound indexes
eventSchema.index({ sessionId: 1, timestamp: 1 });
sessionSchema.index({ updatedAt: -1 });
sessionSchema.index({ userId: 1, updatedAt: -1 }); // For multi-tenant session queries
sandboxAllocationSchema.index({ userId: 1, allocationStrategy: 1, isActive: 1 });
sandboxAllocationSchema.index({ sessionId: 1, isActive: 1 });

/**
 * Session model
 */
export const SessionModel = model<SessionDocument>('Session', sessionSchema);

/**
 * Event model
 */
export const EventModel = model<EventDocument>('Event', eventSchema);

/**
 * User configuration model
 */
export const UserConfigModel = model<UserConfigDocument>('UserConfig', userConfigSchema);

/**
 * Sandbox allocation model
 */
export const SandboxAllocationModel = model<SandboxAllocationDocument>(
  'SandboxAllocation',
  sandboxAllocationSchema,
);
