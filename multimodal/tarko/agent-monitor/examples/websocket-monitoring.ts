/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentStateMonitor, createStatusLogger } from '../src';

/**
 * Example: WebSocket-based agent monitoring
 * 
 * This example demonstrates how to monitor agent execution state
 * using WebSocket connection to AgentServer.
 */
async function main() {
  const logger = createStatusLogger('[WebSocket Monitor]');
  
  const monitor = new AgentStateMonitor({
    serverUrl: 'http://localhost:8899',
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000
  });

  // Setup event handlers
  monitor.on({
    onConnected: () => {
      logger.logConnection(true, 'WebSocket');
    },
    
    onDisconnected: () => {
      logger.logConnection(false, 'WebSocket');
    },
    
    onStatusChange: (status) => {
      logger.logStatus(status);
      
      // Log detailed phase information
      if (status.phase) {
        console.log(`  Phase: ${status.phase}`);
      }
      if (status.estimatedTime) {
        console.log(`  Estimated time: ${status.estimatedTime}`);
      }
    },
    
    onEvent: (event) => {
      console.log(`[WebSocket Monitor] Event: ${event.type}`);
      if (event.type === 'assistant_message') {
        console.log(`  Content: ${event.data?.content?.substring(0, 100)}...`);
      }
    },
    
    onCompletion: (result) => {
      logger.logCompletion(result);
    },
    
    onError: (error) => {
      logger.logError(error);
    },
    
    onAborted: () => {
      console.log('[WebSocket Monitor] Operation aborted by user');
    }
  });

  try {
    // Connect to server
    console.log('Connecting to AgentServer...');
    await monitor.connect();
    
    // Get server status
    const serverStatus = await monitor.getServerStatus();
    console.log('Server status:', serverStatus);
    
    // Join a session (replace with actual session ID)
    const sessionId = 'example-session-' + Date.now();
    console.log(`Joining session: ${sessionId}`);
    monitor.joinSession(sessionId);
    
    // Send a test query
    console.log('Sending test query...');
    monitor.sendQuery('What is the current time?');
    
    // Wait for completion or timeout
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Operation timed out'));
      }, 60000); // 1 minute timeout
      
      monitor.on({
        onCompletion: () => {
          clearTimeout(timeout);
          resolve(undefined);
        },
        onError: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
    
  } catch (error) {
    console.error('Monitor error:', error);
  } finally {
    // Clean up
    monitor.disconnect();
    console.log('Monitor disconnected');
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}
