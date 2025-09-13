# Minimal API Set Analysis for Production Server

This document analyzes the minimal API endpoints required by the Web UI for production deployment.

## Analysis Methodology

Analyzed the following components:
- `multimodal/tarko/agent-ui/src/common/services/apiService.ts` - Main API service
- `multimodal/tarko/agent-ui/src/common/constants/index.ts` - API endpoints
- `multimodal/tarko/agent-server/src/api/routes/*` - Server route definitions
- Web UI state management and component usage patterns

## Core API Endpoints (Essential)

### 1. System Health & Information
```
GET /api/v1/health
GET /api/v1/version
GET /api/v1/agent/options
```
**Usage**: Server health checks, version display (AboutModal), workspace info
**Critical**: Mixed - `/health` and `/agent/options` essential, `/version` optional

### 2. Session Management
```
GET /api/v1/sessions
POST /api/v1/sessions/create
GET /api/v1/sessions/details?sessionId={id}
GET /api/v1/sessions/status?sessionId={id}
POST /api/v1/sessions/update
POST /api/v1/sessions/delete
```
**Usage**: Session lifecycle, chat history, metadata management
**Critical**: Yes - Core functionality
**Note**: `sessions/details` only used for metadata restoration when session has existing messages

### 3. Query Execution
```
POST /api/v1/sessions/query
POST /api/v1/sessions/query/stream
POST /api/v1/sessions/abort
```
**Usage**: Chat interactions, streaming responses, query cancellation
**Critical**: Yes - Primary user interaction

### 4. Event Streaming (Legacy)
```
GET /api/v1/sessions/events?sessionId={id}
```
**Usage**: Session restoration, message history loading
**Critical**: Yes - Required for session persistence
**Note**: Marked as FIXME in code, candidate for deprecation

## Model Management
```
GET /api/v1/models
POST /api/v1/sessions/model
```
**Usage**: Model selection UI, dynamic model switching
**Critical**: Medium - Enhanced UX but not core functionality

## Workspace Features
```
GET /api/v1/sessions/workspace/search?sessionId={id}&q={query}
POST /api/v1/sessions/workspace/validate
```
**Usage**: File/directory search, contextual selector, path validation
**Critical**: Medium - Improves UX for file operations

## Sharing Features
```
GET /api/v1/share/config
POST /api/v1/sessions/share
```
**Usage**: Session sharing, export functionality
**Critical**: Low - Optional feature

## Summary Generation
```
POST /api/v1/sessions/generate-summary
```
**Usage**: Auto-naming conversations
**Critical**: Low - Fallback to "Untitled Conversation"

## One-shot Operations (Optional)
```
POST /api/v1/oneshot/query
POST /api/v1/oneshot/query/stream
```
**Usage**: Single-request session creation + query
**Critical**: Low - Convenience API

## WebSocket Events (Real-time)

### Essential Events
- `connect/disconnect` - Connection status
- `join-session` - Session subscription
- `agent-event` - Real-time event streaming
- `agent-status` - Processing status updates
- `ping` - Health monitoring

### Query Events
- `send-query` - Alternative to HTTP streaming
- `abort-query` - Query cancellation

## Minimal Production API Set

### Tier 1: Absolutely Required
```
GET /api/v1/health
GET /api/v1/agent/options
GET /api/v1/sessions
POST /api/v1/sessions/create
GET /api/v1/sessions/events
GET /api/v1/sessions/status
POST /api/v1/sessions/update
POST /api/v1/sessions/delete
POST /api/v1/sessions/query/stream
POST /api/v1/sessions/abort
```
**Total**: 10 endpoints
**Functionality**: Basic chat, session management, health monitoring

### Tier 2: Enhanced UX
```
GET /api/v1/version
GET /api/v1/sessions/details
GET /api/v1/models
POST /api/v1/sessions/model
GET /api/v1/sessions/workspace/search
POST /api/v1/sessions/workspace/validate
POST /api/v1/sessions/generate-summary
```
**Total**: +7 endpoints (17 total)
**Functionality**: Version info (AboutModal), metadata restoration, model switching, workspace integration, auto-naming

### Tier 3: Optional Features
```
GET /api/v1/share/config
POST /api/v1/sessions/share
POST /api/v1/sessions/query (non-streaming)
POST /api/v1/oneshot/query
POST /api/v1/oneshot/query/stream
```
**Total**: +5 endpoints (22 total)
**Functionality**: Sharing, convenience APIs

## Recommendations

1. **Minimal Deployment**: Implement Tier 1 (10 endpoints) for basic functionality
2. **Standard Deployment**: Include Tier 1 + Tier 2 (17 endpoints) for full UX
3. **Full Deployment**: All endpoints (22 endpoints) for complete feature set

## Implementation Notes

- WebSocket support is essential for real-time updates
- `/api/v1/sessions/events` is legacy but required for session restoration
- Model management APIs can gracefully degrade if not implemented
- Workspace APIs enhance file operation UX but aren't critical
- Sharing features are completely optional

## Deprecation Candidates

- `GET /api/v1/sessions/events` - Replace with WebSocket-only event streaming
- `POST /api/v1/sessions/query` - Non-streaming variant rarely used
- One-shot APIs - Convenience wrappers that add complexity
