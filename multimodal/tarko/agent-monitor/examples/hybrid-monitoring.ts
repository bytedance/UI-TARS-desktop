/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  AgentMonitorManager, 
  createHybridMonitorConfig, 
  createStatusLogger,
  formatDuration,
  waitForCompletion
} from '../src';

/**
 * Example: Hybrid monitoring with automatic fallback
 * 
 * This example demonstrates the recommended monitoring approach:
 * 1. Try WebSocket connection first
 * 2. Automatically fall back to CLI process monitoring if WebSocket fails
 * 3. Provide unified API regardless of active strategy
 */
async function main() {
  const logger = createStatusLogger('[Hybrid Monitor]');
  const startTime = new Date();
  
  // Create hybrid configuration
  const config = createHybridMonitorConfig(
    'http://localhost:8899', // WebSocket URL
    'tarko-cli',             // Fallback CLI command
    ['run', '"What is 2+2?"', '--mode=silent', '--format=json'], // CLI args
    {
      websocket: {
        timeout: 3000,         // Shorter timeout for faster fallback
        maxReconnectAttempts: 2
      },
      cli: {
        timeout: 60000,        // 1 minute timeout for CLI
        parseJsonOutput: true
      }
    }
  );
  
  const manager = new AgentMonitorManager(config);
  
  // Setup unified event handlers
  manager.on({
    onStatusChange: (status) => {
      logger.logStatus(status);
      
      const state = manager.getState();
      console.log(`  Active monitor: ${state.activeType}`);
      console.log(`  Connected: ${state.isConnected}`);
      console.log(`  Running: ${state.isRunning}`);
    },
    
    onCompletion: (result) => {
      const duration = formatDuration(startTime);
      logger.logCompletion(result, duration);
      
      const state = manager.getState();
      console.log(`Completed using ${state.activeType} monitor in ${duration}`);
    },
    
    onError: (error) => {
      logger.logError(error);
      
      const state = manager.getState();
      if (state.activeType === 'websocket') {
        console.log('WebSocket monitor failed, checking for CLI fallback...');
      }
    },
    
    onConnected: () => {
      const state = manager.getState();
      logger.logConnection(true, state.activeType || 'unknown');
    },
    
    onDisconnected: () => {
      const state = manager.getState();
      logger.logConnection(false, state.activeType || 'unknown');
    },
    
    onOutput: (output, type) => {
      // Only available for CLI monitoring
      if (type === 'stdout' && output.trim()) {
        console.log(`[CLI Output]: ${output.trim()}`);
      }
    },
    
    onAborted: () => {
      console.log('[Hybrid Monitor] Operation aborted');
    }
  });
  
  try {
    console.log('Starting hybrid monitoring...');
    console.log('Will try WebSocket first, then fall back to CLI if needed');
    
    // Start monitoring (will try WebSocket first, then CLI fallback)
    await manager.start();
    
    const state = manager.getState();
    console.log(`Successfully started ${state.activeType} monitoring`);
    
    // If WebSocket monitoring is active, we can interact with sessions
    if (state.activeType === 'websocket') {
      try {
        const serverStatus = await manager.getServerStatus();
        console.log('Server status:', serverStatus);
        
        // Join or create a session
        const sessionId = 'hybrid-example-' + Date.now();
        manager.joinSession(sessionId);
        console.log(`Joined session: ${sessionId}`);
        
        // Send a query
        manager.sendQuery('What is the current weather?');
        
      } catch (error) {
        console.log('WebSocket interaction failed:', error);
      }
    } else if (state.activeType === 'cli_process') {
      console.log('Using CLI process monitoring - query already sent via CLI args');
    }
    
    // Wait for completion with timeout
    console.log('Waiting for completion...');
    const result = await waitForCompletion(manager, 120000); // 2 minutes
    
    console.log('Final result:', result);
    
  } catch (error) {
    console.error('Monitoring failed:', error);
    
    // Show final state for debugging
    const state = manager.getState();
    console.log('Final state:', state);
    
  } finally {
    // Clean up resources
    await manager.stop();
    console.log('Monitor stopped');
  }
}

/**
 * Example with custom error handling and retry logic
 */
async function advancedExample() {
  const logger = createStatusLogger('[Advanced Monitor]');
  let retryCount = 0;
  const maxRetries = 3;
  
  const attemptMonitoring = async (): Promise<any> => {
    const config = createHybridMonitorConfig(
      'http://localhost:8899',
      'tarko-cli',
      ['run', '"Explain quantum computing"', '--mode=silent']
    );
    
    const manager = new AgentMonitorManager(config);
    
    return new Promise((resolve, reject) => {
      manager.on({
        onCompletion: resolve,
        onError: (error) => {
          logger.logError(error);
          
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying... (${retryCount}/${maxRetries})`);
            
            setTimeout(() => {
              manager.cleanup();
              attemptMonitoring().then(resolve).catch(reject);
            }, 5000);
          } else {
            reject(new Error(`Failed after ${maxRetries} attempts: ${error.message}`));
          }
        }
      });
      
      manager.start().catch(reject);
    });
  };
  
  try {
    const result = await attemptMonitoring();
    console.log('Advanced monitoring completed:', result);
  } catch (error) {
    console.error('Advanced monitoring failed completely:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  // Run basic example
  main()
    .then(() => {
      console.log('\n--- Running advanced example ---\n');
      return advancedExample();
    })
    .catch(console.error);
}
