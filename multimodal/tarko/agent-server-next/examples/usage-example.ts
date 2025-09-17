/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Complete usage example of the AgentServer hook system
 * 
 * This file demonstrates how to:
 * 1. Create custom middleware hooks
 * 2. Register hooks with different priorities
 * 3. Use built-in hooks
 * 4. Manage hook lifecycle
 * 5. Debug and monitor hooks
 */

import { AgentServer } from '../src/server';
import type { AgentServerInitOptions } from '../src/types';
import { registerAuditLogHook } from './custom-hooks';

async function createServerWithHooks() {
  const serverOptions: AgentServerInitOptions = {
    appConfig: {
      agent: { type: 'local', path: 'MyAgent' } as any,
      workspace: 'example-workspace',
      logLevel: 'info' as any,
      server: {
        port: 3000,
        storage: { type: 'sqlite' },
        tenant: { mode: 'single', auth: false },
      },
    },
    directories: {
      globalWorkspaceDir: './workspace',
    },
  };

  const server = new AgentServer(serverOptions);
  
  registerAuditLogHook(server);

  return server;
}


// Main usage example
async function main() {
  try {
    console.log('Creating AgentServer with hook system...');
    
    const server = await createServerWithHooks();

    await server.start();
    
    console.log('Server started successfully with hook system!');

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}