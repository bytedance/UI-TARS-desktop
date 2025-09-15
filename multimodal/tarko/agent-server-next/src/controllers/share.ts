/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { createErrorResponse } from '../utils/error-handler';
import type { HonoContext } from '../types';

/**
 * Get share configuration
 */
export async function getShareConfig(c: HonoContext) {
  try {
    const server = c.get('server');

    // Basic share configuration
    const shareConfig: any = {
      enabled: true,
      maxSessions: 100,
      defaultExpirationDays: 7,
      supportedFormats: ['json', 'markdown', 'html'],
      features: {
        publicSharing: true,
        passwordProtection: false, // Could be enhanced later
        customExpiration: true,
        downloadFormats: ['json', 'markdown'],
      },
      limits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxEvents: 1000,
        maxSharedSessions: 50,
      },
    };

    // Add storage-specific limitations if storage is configured
    if (server.storageProvider) {
      const storageInfo = server.getStorageInfo();
      shareConfig.storage = {
        type: storageInfo.type,
        persistent: true,
      };
    } else {
      shareConfig.storage = {
        type: 'memory',
        persistent: false,
      };
      shareConfig.features.publicSharing = false; // Disable public sharing without persistent storage
    }

    return c.json(
      {
        shareConfig,
        timestamp: Date.now(),
      },
      200,
    );
  } catch (error) {
    console.error('Failed to get share config:', error);
    return c.json(createErrorResponse(error), 500);
  }
}
