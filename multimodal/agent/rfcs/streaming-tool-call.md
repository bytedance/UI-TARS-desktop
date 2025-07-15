# Streaming Tool Call

## 1. Overview

The Streaming Tool Call feature enables real-time exposure of tool call construction progress through event streams in the Agent system. This enhancement significantly improves user experience, especially for tools that generate large amounts of data (e.g., `write_file`), by allowing users to see the tool call being constructed in real-time rather than waiting for completion.

## 2. Problem Statement

The current Agent ToolCallEngine architecture's `processStreamingChunk` method does not support streaming messages for tool calls. It fails to emit streaming events to the event stream, causing users to wait without any feedback during tool call construction, even when the underlying LLM response is streamed.

## 3. Design Goals

- **Real-time Feedback**: Provide immediate visual feedback during tool call argument construction
- **Minimal Performance Impact**: Optional feature that can be disabled to avoid overhead
- **Engine Consistency**: Ensure all three ToolCallEngines (Native, PromptEngineering, StructuredOutputs) provide consistent behavior
- **Argument Accumulation**: Enable clients to reconstruct complete tool arguments by accumulating delta chunks
- **Backward Compatibility**: No breaking changes to existing APIs

## 4. Event Schema Design

### AssistantStreamingToolCallEvent

```typescript
/**
 * Assistant streaming tool call event - for real-time tool call updates
 */
export interface AssistantStreamingToolCallEvent extends BaseEvent {
  type: "assistant_streaming_tool_call";

  /** Tool call ID being constructed */
  toolCallId: string;

  /** Tool name (may be empty if still being constructed) */
  toolName: string;

  /**
   * Delta arguments - only the incremental part of arguments in this chunk
   * Client should accumulate these deltas to build complete arguments
   * Note: Delta design accommodates tools like write_file that may produce large chunks
   */
  arguments: string;

  /** Whether this tool call is complete */
  isComplete: boolean;

  /**
   * Unique message identifier that links streaming tool calls to their final message
   * This allows clients to correlate incremental updates with complete messages
   */
  messageId?: string;
}
```

## 5. Architecture Components

### 5.1 Three ToolCallEngine Implementations

#### NativeToolCallEngine
- **Status**: ✅ Fully Supported
- **Implementation**: Direct LLM streaming tool call support
- **Behavior**: Emits streaming updates for each argument delta chunk
- **Completion**: Emits final event with `isComplete: true` on `finish_reason: "tool_calls"`

#### PromptEngineeringToolCallEngine  
- **Status**: ✅ Fully Supported with State Machine
- **Implementation**: XML tag parsing with streaming state machine
- **State Machine States**:
  - `normal_content`: Processing regular assistant message content
  - `collecting_tool_call`: Inside `<tool_call>...</tool_call>` tags
  - `parsing_arguments`: Processing JSON arguments within tool call
- **Key Features**:
  - Filters out XML tags from normal content (aligned with native behavior)
  - Emits argument deltas only during JSON construction phase
  - Prevents duplicate parsing if tool calls already extracted during streaming

#### StructuredOutputsToolCallEngine
- **Status**: ❌ Limited Support (Disabled with Warning)
- **Reason**: Complex implementation requirements for proper streaming support
- **Fallback**: Users can utilize PromptEngineeringToolCallEngine for streaming needs
- **Warning**: Logs warning when streaming tool calls are enabled with this engine

### 5.2 Configuration Management

```typescript
interface AgentOptions {
  // ... existing options
  enableStreamingToolCallEvents?: boolean; // Default: false
}
```

**Performance Optimization**: When disabled, all streaming tool call processing is bypassed to avoid computational overhead.

## 6. Implementation Details

### 6.1 Argument Delta Accumulation Strategy

**Critical Design Principle**: Emit raw chunk deltas, never repaired or modified content.

**Example of Correct Delta Sequence**:
```json
// Chunk 1
{ "arguments": "{\"", "isComplete": false }
// Chunk 2  
{ "arguments": "location", "isComplete": false }
// Chunk 3
{ "arguments": "\":\"", "isComplete": false }
// Chunk 4
{ "arguments": "Boston", "isComplete": false }
// Chunk 5
{ "arguments": "\"}", "isComplete": false }
```

**Client Accumulation**: `"{\"" + "location" + "\":\"" + "Boston" + "\"}" = "{\"location\":\"Boston\"}"`

### 6.2 State Management

Each ToolCallEngine maintains internal state to track:
- Current parsing phase
- Accumulated content buffers
- Tool call construction progress
- Completion status

### 6.3 Error Handling

- **Malformed JSON**: Graceful handling without crashing
- **Incomplete Chunks**: Buffer management for partial content
- **Invalid Tool Names**: Defensive parsing with fallbacks

## 7. Web UI Integration

### 7.1 Real-time Rendering
- **Target**: `write_file` tool visualization in workspace panel
- **Strategy**: Accumulate argument deltas and use `jsonrepair` for safe parsing
- **Performance**: Minimize serialization/deserialization overhead
- **State Transition**: Seamless transition from streaming to completed tool call state

### 7.2 Event Processing Flow
1. Listen for `assistant_streaming_tool_call` events
2. Accumulate arguments by `toolCallId` and `messageId`
3. Attempt JSON parsing with `jsonrepair` for preview
4. Update UI components in real-time
5. Transition to final state on `tool_call` event

## 8. Testing Strategy

### 8.1 Unit Testing Coverage
- **Engine-specific tests**: Each ToolCallEngine with real LLM response data
- **Accumulation tests**: Verify delta accumulation produces valid JSON
- **Cross-engine consistency**: Ensure all engines produce compatible output
- **Error handling**: Malformed input and edge cases

### 8.2 Integration Testing
- **Agent-level tests**: End-to-end streaming tool call events
- **Multi-loop scenarios**: Verify proper separation by `messageId`
- **Performance benchmarks**: Measure overhead when feature is enabled/disabled

## 9. Performance Considerations

### 9.1 Optimization Strategies
- **Conditional Processing**: Skip all streaming logic when disabled
- **Efficient Buffering**: Minimize memory allocation for content accumulation
- **Event Throttling**: Avoid excessive event emission for rapid chunks

### 9.2 Memory Management
- **Buffer Cleanup**: Clear accumulated state after tool call completion
- **State Isolation**: Prevent memory leaks across multiple tool calls

## 10. Server Architecture

### 10.1 Storage Strategy
**Critical**: `assistant_streaming_tool_call` events are NOT persisted in storage to prevent:
- Performance degradation on re-renders
- Storage bloat from high-frequency events
- Redundant data (final tool calls contain complete information)

### 10.2 Event Streaming
- Real-time emission through WebSocket/SSE connections
- Proper event ordering and delivery guarantees
- Client-side reconstruction capabilities

## 11. Migration and Rollout

### 11.1 Backward Compatibility
- Feature is opt-in via configuration flag `enableStreamingToolCallEvents`
- Existing tool call behavior unchanged when disabled
- No modifications to existing event schemas

### 11.2 Deployment Strategy
1. **Phase 1**: Core engine implementation with unit tests
2. **Phase 2**: Agent integration with configuration options
3. **Phase 3**: Web UI streaming support for `write_file`
4. **Phase 4**: Extended tool support and performance optimization

## 12. Future Enhancements

### 12.1 Tool-Specific Optimizations
- Specialized streaming strategies for different tool types
- Content-aware chunking for large file operations
- Progressive rendering for structured outputs

### 12.2 Advanced Features
- Stream cancellation and interruption
- Client-side caching of accumulated arguments
- Enhanced error recovery mechanisms

## 13. Conclusion

The Streaming Tool Call feature provides a significant user experience improvement by enabling real-time visibility into tool call construction. The design prioritizes performance, maintains backward compatibility, and provides a solid foundation for future enhancements while ensuring consistent behavior across all ToolCallEngine implementations.
