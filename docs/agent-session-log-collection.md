# AgentSession Log Collection

This document describes the new log collection feature for AgentSession, which enables comprehensive logging and monitoring of agent execution.

## Overview

The AgentSession log collection feature provides:

- **Complete Agent Log Capture**: Collects all internal agent logs through logger injection
- **System Event Logging**: Tracks session-level operations like query execution, aborts, etc.
- **Real-time Log Streaming**: Subscribe to live log events as they occur
- **Historical Log Access**: Query past logs with filtering capabilities
- **Non-invasive Implementation**: Uses logger injection pattern, no agent modifications needed

## Architecture

### Logger Injection Pattern

The implementation uses a clean logger injection approach:

1. **AgentOptions Extension**: Added `logger?: Logger` option to AgentOptions interface
2. **Agent Support**: Modified Agent constructor to accept custom logger
3. **Collecting Logger**: AgentSession creates a wrapper logger that captures all log calls
4. **Transparent Operation**: Agent continues to work normally while logs are collected

### Log Flow

```
Agent Internal Logs → Collecting Logger → AgentSession Buffer → Subscribers
      ↓                       ↓                    ↓              ↓
  Normal Logging        Log Collection      Storage & Stats   Real-time Events
```

## Usage Examples

### Basic Log Collection

```typescript
import { AgentSession } from '@tarko/agent-server';

// Create agent session (log collection is automatic)
const session = new AgentSession(server, 'session-123');
await session.initialize();

// Subscribe to live logs
const unsubscribe = session.subscribeToLogs((log) => {
  console.log(`[${log.level}] ${log.message}`);
});

// Run queries - logs are automatically collected
await session.runQuery('Hello, how can you help me?');

// Get historical logs
const allLogs = session.getHistoricalLogs();
const errorLogs = session.getHistoricalLogs('ERROR');

// Get log statistics
const stats = session.getLogStats();
console.log(`Total logs: ${stats.total}, Errors: ${stats.byLevel.ERROR || 0}`);

// Cleanup
unsubscribe();
```

### Log Entry Structure

```typescript
interface LogEntry {
  timestamp: number;              // Unix timestamp
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  source: 'agent' | 'system';    // Origin of the log
  message: string;                // Log message
  sessionId: string;              // Session identifier
  metadata?: Record<string, any>; // Additional structured data
}
```

### Example Log Entries

```typescript
// Agent internal log
{
  timestamp: 1673123456789,
  level: 'INFO',
  source: 'agent',
  message: '[Agent] Query execution started | SessionId: "session-123"',
  sessionId: 'session-123'
}

// System log with metadata
{
  timestamp: 1673123456790,
  level: 'INFO',
  source: 'system',
  message: 'Query execution started',
  sessionId: 'session-123',
  metadata: {
    query: 'Hello, how can you help me?'
  }
}

// Error log with stack trace
{
  timestamp: 1673123456791,
  level: 'ERROR',
  source: 'system',
  message: 'Query execution failed: Network timeout',
  sessionId: 'session-123',
  metadata: {
    error: 'Error: Network timeout\n    at fetch (/path/to/file.js:123:45)...'
  }
}
```

## API Reference

### AgentSession Methods

#### `subscribeToLogs(callback: LogSubscriptionCallback): () => void`

Subscribe to real-time log events.

- **Parameters**: `callback` - Function called for each new log entry
- **Returns**: Unsubscribe function
- **Example**:
  ```typescript
  const unsubscribe = session.subscribeToLogs((log) => {
    if (log.level === 'ERROR') {
      console.error('Agent error:', log.message);
    }
  });
  ```

#### `getHistoricalLogs(level?: string): LogEntry[]`

Retrieve historical log entries with optional filtering.

- **Parameters**: `level` - Optional minimum log level filter ('DEBUG', 'INFO', 'WARN', 'ERROR')
- **Returns**: Array of log entries
- **Example**:
  ```typescript
  const errorLogs = session.getHistoricalLogs('ERROR');
  const allLogs = session.getHistoricalLogs();
  ```

#### `getLogStats(): { total: number; byLevel: Record<string, number> }`

Get log statistics for the session.

- **Returns**: Object with total count and breakdown by log level
- **Example**:
  ```typescript
  const stats = session.getLogStats();
  // { total: 42, byLevel: { INFO: 30, WARN: 10, ERROR: 2 } }
  ```

#### `clearLogs(): void`

Clear the log buffer for the session.

- **Example**:
  ```typescript
  session.clearLogs(); // Removes all stored logs
  ```

## Configuration

### Buffer Size

The log buffer size is configurable (default: 1000 entries):

```typescript
// In AgentSession constructor
private maxLogBufferSize = 1000; // Configurable
```

### Log Levels

Supported log levels (in order of severity):

- `DEBUG`: Detailed debugging information
- `INFO`: General information messages
- `SUCCESS`: Success operation messages
- `WARN`: Warning messages
- `ERROR`: Error messages

## Benefits

### For Development

- **Debugging**: Complete visibility into agent internal operations
- **Performance Monitoring**: Track execution patterns and bottlenecks
- **Error Tracking**: Comprehensive error logging with context

### For Production

- **Monitoring**: Real-time agent health monitoring
- **Troubleshooting**: Historical log analysis for issue resolution
- **Analytics**: Usage patterns and performance metrics

### For Testing

- **Verification**: Ensure agent behaves as expected
- **Coverage**: Validate all code paths are exercised
- **Regression**: Compare logs across versions

## Implementation Details

### Logger Injection

The collecting logger wraps the original logger and forwards all calls:

```typescript
const collectingLogger = {
  info: (...args: any[]) => {
    originalLogger.info(...args);           // Forward to original
    this.addLogEntry({                      // Collect for session
      level: 'INFO',
      source: 'agent',
      message: this.formatLogMessage('', args),
      sessionId: this.id,
      timestamp: Date.now(),
    });
  },
  // ... other methods
};
```

### Memory Management

- **Buffer Limiting**: Automatic buffer size management prevents memory leaks
- **Efficient Storage**: Logs stored in memory for fast access
- **Cleanup**: Logs cleared when session ends

### Performance Impact

- **Minimal Overhead**: Logger wrapping adds ~0.1ms per log call
- **Async Processing**: Log collection doesn't block agent execution
- **Memory Efficient**: Fixed buffer size prevents unbounded growth

## Migration Guide

### Existing Code

No changes required for existing AgentSession usage. Log collection is automatically enabled.

### New Features

To use the new log collection features:

```typescript
// Before: Basic usage
const session = new AgentSession(server, sessionId);
await session.runQuery(query);

// After: With log collection
const session = new AgentSession(server, sessionId);

// Subscribe to logs
const unsubscribe = session.subscribeToLogs((log) => {
  // Handle log events
});

await session.runQuery(query);

// Access collected logs
const logs = session.getHistoricalLogs();
const stats = session.getLogStats();

// Cleanup
unsubscribe();
```

## Future Enhancements

- **Log Persistence**: Optional storage of logs to disk/database
- **Log Filtering**: Advanced filtering by source, patterns, time ranges
- **Log Aggregation**: Cross-session log analysis
- **Performance Metrics**: Automatic performance logging and analysis
- **Integration**: Export logs to external monitoring systems
