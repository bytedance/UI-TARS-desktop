# @tarko/agent-monitor

Comprehensive agent state monitoring solution for Tarko Agent execution.

## Overview

This package provides real-time monitoring capabilities for Tarko Agent execution state through multiple strategies:

1. **WebSocket Monitoring (Primary)** - Real-time connection to AgentServer
2. **CLI Process Monitoring (Fallback)** - Process-based monitoring for silent mode
3. **Unified Manager** - Automatic fallback and consistent API

## Installation

```bash
npm install @tarko/agent-monitor
```

## Quick Start

### WebSocket Monitoring (Recommended)

```typescript
import { AgentStateMonitor } from '@tarko/agent-monitor';

const monitor = new AgentStateMonitor({
  serverUrl: 'http://localhost:8899',
  autoReconnect: true
});

await monitor.connect();
monitor.joinSession('your-session-id');

monitor.on({
  onStatusChange: (status) => {
    console.log(`Agent ${status.isProcessing ? 'processing' : 'idle'}:`, status.message);
  },
  onCompletion: (result) => {
    console.log('Task completed:', result);
  },
  onError: (error) => {
    console.error('Agent error:', error.message);
  }
});
```

### CLI Process Monitoring

```typescript
import { CLIProcessMonitor } from '@tarko/agent-monitor';

const monitor = new CLIProcessMonitor({
  command: 'tarko-cli',
  args: ['run', '"your query"', '--mode=silent', '--format=json'],
  parseJsonOutput: true
});

monitor.on({
  onStatusChange: (status) => {
    console.log('Process status:', status.state);
  },
  onOutput: (output, type) => {
    console.log(`[${type}]:`, output);
  },
  onCompletion: (result) => {
    console.log('Process completed:', result);
  }
});

await monitor.start();
```

### Unified Monitoring with Automatic Fallback

```typescript
import { AgentMonitorManager, createHybridMonitorConfig } from '@tarko/agent-monitor';

const config = createHybridMonitorConfig(
  'http://localhost:8899',
  'tarko-cli',
  ['run', '"your query"', '--mode=silent']
);

const manager = new AgentMonitorManager(config);

manager.on({
  onStatusChange: (status) => console.log('Status:', status),
  onCompletion: (result) => console.log('Completed:', result),
  onError: (error) => console.error('Error:', error)
});

await manager.start();

// Send queries (WebSocket mode)
if (manager.getState().activeType === 'websocket') {
  manager.joinSession('session-id');
  manager.sendQuery('your query');
}
```

## API Reference

### AgentStateMonitor

WebSocket-based monitoring for real-time agent state tracking.

#### Constructor Options

```typescript
interface AgentMonitorOptions {
  serverUrl: string;           // AgentServer WebSocket URL
  timeout?: number;            // Connection timeout (default: 5000ms)
  autoReconnect?: boolean;     // Auto-reconnect on disconnect (default: true)
  maxReconnectAttempts?: number; // Max reconnection attempts (default: 5)
  reconnectDelay?: number;     // Delay between reconnects (default: 1000ms)
}
```

#### Methods

- `connect()` - Connect to AgentServer
- `joinSession(sessionId)` - Join specific agent session
- `sendQuery(query)` - Send query to agent
- `abortQuery()` - Abort current query
- `getServerStatus()` - Get server status
- `disconnect()` - Disconnect from server
- `ping()` - Test server connectivity

### CLIProcessMonitor

Process-based monitoring for CLI agent execution.

#### Constructor Options

```typescript
interface CLIMonitorOptions {
  command: string;             // CLI command to execute
  args: string[];              // Command arguments
  cwd?: string;                // Working directory
  env?: Record<string, string>; // Environment variables
  timeout?: number;            // Execution timeout
  parseJsonOutput?: boolean;   // Parse structured JSON output
}
```

#### Methods

- `start()` - Start CLI process
- `abort()` - Abort running process
- `sendInput(input)` - Send input to process
- `getStatus()` - Get current process status
- `getOutput()` - Get stdout/stderr buffers
- `cleanup()` - Clean up resources

### AgentMonitorManager

Unified interface supporting both monitoring strategies with automatic fallback.

#### Configuration

```typescript
interface MonitorConfig {
  type: 'websocket' | 'cli_process';
  websocket?: AgentMonitorOptions;
  cliProcess?: CLIMonitorOptions;
  enableFallback?: boolean;
  fallbackCLI?: CLIMonitorOptions;
}
```

#### Methods

- `start()` - Start monitoring
- `joinSession(sessionId)` - Join session (WebSocket only)
- `sendQuery(query)` - Send query
- `abort()` - Abort current operation
- `getState()` - Get current monitor state
- `ping()` - Test connectivity
- `stop()` - Stop monitoring

## Event Types

### Status Events

```typescript
interface AgentStatusInfo {
  isProcessing: boolean;       // Whether agent is processing
  state?: string;              // Current state
  phase?: AgentProcessingPhase; // Detailed processing phase
  message?: string;            // Status message
  estimatedTime?: string;      // Estimated completion time
}
```

### CLI Status Events

```typescript
interface CLIProcessStatus {
  state: 'idle' | 'starting' | 'executing' | 'completed' | 'aborted' | 'error';
  pid?: number;
  startTime?: Date;
  endTime?: Date;
  exitCode?: number;
}
```

## Utility Functions

### Configuration Helpers

```typescript
// Create WebSocket config
const config = createWebSocketMonitorConfig('http://localhost:8899');

// Create CLI config
const config = createCLIMonitorConfig('tarko-cli', ['run', 'query']);

// Create hybrid config with fallback
const config = createHybridMonitorConfig(
  'http://localhost:8899',
  'tarko-cli',
  ['run', 'query', '--mode=silent']
);
```

### Monitoring Helpers

```typescript
// Simple WebSocket monitor
const monitor = await createSimpleMonitor('http://localhost:8899', 'session-id');

// CLI-only monitor
const monitor = await createCLIOnlyMonitor('tarko-cli', ['run', 'query']);

// Wait for completion with timeout
const result = await waitForCompletion(monitor, 300000);

// Auto-detect best strategy
const config = await autoDetectMonitoringStrategy(
  'http://localhost:8899',
  'tarko-cli',
  ['run', 'query']
);
```

## Architecture

### WebSocket Monitoring Flow

1. Connect to AgentServer WebSocket endpoint
2. Join specific agent session
3. Receive real-time status updates and events
4. Send queries and receive responses
5. Handle connection recovery automatically

### CLI Process Monitoring Flow

1. Spawn CLI process with specified arguments
2. Monitor stdout/stderr for structured output
3. Parse JSON events if enabled
4. Track process lifecycle and exit codes
5. Handle process termination and cleanup

### Hybrid Monitoring Flow

1. Attempt WebSocket connection first
2. Fall back to CLI process if WebSocket fails
3. Provide unified API regardless of active strategy
4. Handle automatic reconnection and recovery

## Best Practices

### When to Use WebSocket Monitoring

- ✅ AgentServer is running in server mode
- ✅ Need real-time status updates
- ✅ Multiple concurrent sessions
- ✅ Long-running operations
- ✅ Interactive scenarios

### When to Use CLI Process Monitoring

- ✅ One-shot silent mode executions
- ✅ WebSocket connection not available
- ✅ Simple automation scripts
- ✅ Legacy system integration
- ✅ Offline processing

### Error Handling

```typescript
monitor.on({
  onError: (error) => {
    console.error('Monitor error:', error.message);
    
    // Implement retry logic
    setTimeout(() => {
      monitor.connect().catch(console.error);
    }, 5000);
  },
  onDisconnected: () => {
    console.warn('Monitor disconnected, attempting reconnection...');
  }
});
```

### Resource Cleanup

```typescript
// Always clean up resources
process.on('SIGINT', () => {
  monitor.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  monitor.cleanup();
  process.exit(0);
});
```

## Examples

See the `examples/` directory for complete usage examples:

- `websocket-monitoring.ts` - WebSocket monitoring example
- `cli-monitoring.ts` - CLI process monitoring example
- `hybrid-monitoring.ts` - Unified monitoring with fallback
- `status-dashboard.ts` - Real-time status dashboard

## License

Apache-2.0
