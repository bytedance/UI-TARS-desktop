/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentEventStream,
  AgentServerVersionInfo,
  SessionInfo,
  AgentWebUIImplementation,
} from '@tarko/interface';

/**
 * Input options for building agent UI replay HTML
 */
export interface AgentUIBuilderInputOptions {
  /** Session events to include in the replay */
  events: AgentEventStream.Event[];

  /** Session information */
  sessionInfo: SessionInfo;

  /** Path to static web UI files (optional, will use built-in static files if not provided) */
  staticPath?: string;

  /** Optional server version info */
  serverInfo?: AgentServerVersionInfo;

  /** Optional web UI configuration to inject */
  uiConfig?: AgentWebUIImplementation;
}

/**
 * Upload options for sharing
 */
export interface UploadOptions {
  /** Custom slug for the share URL */
  slug?: string;
  
  /** Original user query for metadata */
  query?: string;
}
