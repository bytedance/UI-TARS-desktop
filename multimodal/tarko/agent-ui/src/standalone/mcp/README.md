# MCP Panel - Model Context Protocol Server Management

## Overview

The MCP Panel is a comprehensive UI feature for managing Model Context Protocol (MCP) servers and calling their tools. It provides a user-friendly interface for:

- Managing MCP server configurations (add, edit, delete)
- Activating/deactivating servers
- Viewing available tools for each server
- Calling tools with dynamic parameter forms
- Viewing tool results (both streaming and non-streaming)

## Features

### 1. MCP Dashboard (`/mcp`)
- **Server List**: Grid view of all configured MCP servers
- **Search & Filter**: Search servers by name, type, or status
- **Quick Actions**: 
  - Activate/Deactivate servers
  - Refresh server status
  - Edit server configuration
  - Delete servers
- **Global Actions**:
  - Add new server
  - Cleanup all servers (deactivate all)
  - Refresh all servers

### 2. Server Management
- **Add Server**: Modal form to add new MCP servers
- **Edit Server**: Update existing server configurations
- **Server Types Supported**:
  - Command-based servers (e.g., `npx` commands)
  - HTTP servers
  - SSE (Server-Sent Events) servers
  - In-memory servers
- **Configuration Options**:
  - Server name (unique identifier)
  - Command/URL based on type
  - Arguments (for command-based servers)
  - Environment variables
  - Tool filters (allow/block specific tools)

### 3. Server Detail Page (`/mcp/:serverName`)
- **Server Information**: Display server type, connection details, status
- **Tools List**: Searchable list of available tools
- **Tool Calling**:
  - Dynamic form generation based on JSON Schema
  - Support for various parameter types (string, number, boolean, object, array)
  - Streaming and non-streaming modes
  - Real-time result display

### 4. Tool Result Viewer
- **Display Modes**:
  - JSON: Formatted JSON with syntax highlighting
  - Text: Pre-formatted text output
  - Error: Highlighted error messages
- **Streaming Support**: Incremental display of streaming events

## File Structure

```
src/standalone/mcp/
├── McpDashboard.tsx          # Main servers list page
├── McpServerForm.tsx          # Add/Edit server modal
├── McpServerDetail.tsx        # Server detail + tools page
├── components/
│   ├── ServerCard.tsx         # Server list item component
│   ├── ServerStatusBadge.tsx  # Status indicator component
│   ├── ToolCallForm.tsx       # Dynamic form for tool parameters
│   └── ToolResultRenderer.tsx # Tool result display component
└── README.md                  # This file

src/common/services/
└── mcpService.ts              # API wrapper for MCP endpoints

src/common/state/atoms/
└── mcp.ts                     # MCP state atoms (Jotai)

src/common/types/
└── mcp.ts                     # MCP TypeScript interfaces
```

## API Contract

The MCP Panel expects the following backend API endpoints:

### Server Management
- `GET /api/v1/mcp/servers` - Get all servers
- `POST /api/v1/mcp/servers` - Add new server
- `PUT /api/v1/mcp/servers/:name` - Update server
- `DELETE /api/v1/mcp/servers/:name` - Delete server
- `POST /api/v1/mcp/servers/:name/activate` - Activate/deactivate server
- `GET /api/v1/mcp/servers/:name/status` - Get server status

### Tools
- `GET /api/v1/mcp/servers/:name/tools` - Get server tools
- `POST /api/v1/mcp/servers/:name/tools/:toolId/call` - Call tool (sync or streaming)

### Utilities
- `POST /api/v1/mcp/cleanup` - Cleanup all servers

## Mock Mode

The MCP Panel includes a mock mode for development and testing without a backend:

1. **Enable Mock Mode**: Set `USE_MOCK_DATA = true` in `mcpService.ts`
2. **Mock Data**: Pre-configured servers and tools are available
3. **Simulated Delays**: Network delays are simulated for realistic UX
4. **Streaming Simulation**: Mock streaming events for testing

## Usage

### Navigation
- Click the **Server icon** (🖥️) in the sidebar to access the MCP Dashboard
- From the dashboard, click any server card to view its details and tools

### Adding a Server
1. Click "Add Server" button in the dashboard
2. Fill in the server details:
   - Name (required, unique)
   - Type (command/http/sse/in-memory)
   - Command or URL (based on type)
   - Arguments (for command-based servers)
   - Environment variables (optional)
   - Tool filters (optional)
3. Click "Add Server" to save

### Calling a Tool
1. Navigate to a server's detail page
2. Ensure the server is active (activate if needed)
3. Find the tool you want to call
4. Click to expand the tool
5. Fill in the required parameters
6. Toggle "Use streaming" if desired
7. Click "Call Tool"
8. View the result below the form

## State Management

The MCP Panel uses Jotai for state management:

- `mcpServersAtom`: List of all servers
- `selectedServerAtom`: Currently selected server name
- `mcpLoadingAtom`: Loading state
- `mcpErrorAtom`: Error state
- `mcpSearchQueryAtom`: Search query for filtering
- `filteredServersAtom`: Derived atom for filtered servers

## Styling

The MCP Panel follows the existing design system:
- Tailwind CSS for styling
- Dark mode support
- Responsive design (mobile-friendly)
- Consistent with other UI components

## Future Enhancements

- [ ] Server health monitoring with auto-refresh
- [ ] Tool call history and logs
- [ ] Batch tool operations
- [ ] Export/import server configurations
- [ ] Advanced filtering and sorting
- [ ] Tool favorites/bookmarks
- [ ] Real-time server metrics
- [ ] WebSocket support for live updates

## Development

### Phase A (Current)
- ✅ Mock UI with static data
- ✅ All components implemented
- ✅ Navigation integrated
- ✅ Form validation working

### Phase B (Next)
- [ ] Backend API integration
- [ ] Real streaming implementation
- [ ] Error handling improvements
- [ ] Unit tests

### Phase C (Future)
- [ ] Animations and transitions
- [ ] Accessibility improvements
- [ ] Performance optimizations
- [ ] Documentation updates