/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import type { AgentServer } from '../src/types';
import { getLogger } from '../src/utils/logger';

const logger = getLogger('CustomHooks');

export function registerMinimalHook(server: AgentServer) {
  server.registerHook({
    id: 'test',
    name: 'test-hook',
    priority: 850,
    handler: async (c, next) => {
      console.log('minimal hook: run before next...')
      await next();
      console.log('minimal hook: run after next...')
    }
  });
}

export function registerAuditLogHook(server: AgentServer) {
  server.registerHook({
    id: 'audit-log',
    name: 'Audit Logging',
    priority: 580,
    description: 'Logs security-relevant events for auditing',
    handler: async (c, next) => {
      const startTime = Date.now();
      const clientIP = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
      const userAgent = c.req.header('user-agent') || 'unknown';
      const method = c.req.method;
      const path = c.req.path;
      
      const isSecurityRelevant = 
        path.includes('/auth') || 
        path.includes('/login') || 
        path.includes('/admin') ||
        method !== 'GET';

      try {
        await next();
        
        if (isSecurityRelevant) {
          const duration = Date.now() - startTime;
          const status = c.res.status;
          
          logger.info(`[AUDIT] ${clientIP} ${method} ${path} ${status} ${duration}ms`, {
            ip: clientIP,
            userAgent,
            method,
            path,
            status,
            duration,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        
        if (isSecurityRelevant) {
          logger.warn(`[AUDIT] ${clientIP} ${method} ${path} ERROR ${duration}ms`, {
            ip: clientIP,
            userAgent,
            method,
            path,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration,
            timestamp: new Date().toISOString(),
          });
        }
        
        throw error;
      }
    },
  });

  logger.info('Audit logging hook registered');
}

