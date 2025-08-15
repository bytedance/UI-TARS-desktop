/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentAppConfig } from '@tarko/interface';
import { findAvailablePort } from './port';

export async function ensureServerConfig(appConfig: AgentAppConfig): Promise<void> {
  // Ensure server config exists with defaults
  if (!appConfig.server) {
    appConfig.server = {
      port: 8888,
    };
  }

  // Find available port
  const availablePort = await findAvailablePort(appConfig.server.port!);
  if (availablePort !== appConfig.server.port) {
    console.log(`🔄 Port ${appConfig.server.port} unavailable, switching to ${availablePort}`);
    appConfig.server.port = availablePort;
  }
}
