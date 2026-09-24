# MCP Hub Integration Examples

This directory contains examples showing how to integrate with MCP Hub using different languages and frameworks.

## Understanding MCP Hub Architecture

### Core Concepts

1. **Server Lifecycle**

   ```plaintext
   [First Client] -----> Start Server -----> Server Running <----- Connect [Other Clients]
                                                |
   [Last Client] ------> Unregister -------> Auto Shutdown
   ```

   - Server auto-starts on first client connection
   - Multiple clients can connect/disconnect
   - Server auto-stops after last client

2. **Client Responsibilities**
   ```plaintext
   1. Start server/connect
   2. Register client
   3. Use API endpoints
   4. Unregister and stop
   ```

### Available Examples

1. **Node.js Client** (`node-client.js`)

   - Full server lifecycle management
   - Real-time events via SSE
   - Clean process handling
   - Error recovery

2. **Neovim Integration** (`neovim-integration.lua`)
   - Simple setup-based integration
   - Server start/stop handling
   - Status monitoring
   - Clean process management

## Usage Examples

### Node.js Client

```javascript
const MCPHubClient = require("./node-client.js");

async function main() {
  const client = new MCPHubClient(3000);

  try {
    // Start server or connect to existing
    await client.start();

    // Use MCP features
    const status = await client.getStatus();
    console.log(status);

    // Clean shutdown
    await client.stop();
  } catch (error) {
    console.error(error);
    await client.stop();
  }
}
```

### Neovim Integration

```lua
-- In your plugin setup
local mcp = require('neovim-integration')

-- Setup client and commands
local client = mcp.setup({
    port = 3000,
    config = vim.fn.expand("~/.config/mcp-hub/config.json")
})

-- Manual usage if needed
client:start()  -- Start server or connect
client:stop()   -- Clean shutdown
```

## Implementation Details

### Server Management

1. **Starting Server**

   ```plaintext
   1. Check if server running (health check)
   2. If not running:
      - Spawn mcp-hub process
      - Wait for ready signal
      - Register client
   3. If running:
      - Just register client
   ```

2. **Stopping Server**
   ```plaintext
   1. Unregister client
   2. Clear local state
   3. Server auto-stops if last client
   ```

### API Integration

```plaintext
GET /api/health
- Check server status
- Verify server identity

POST /api/client/register
- Register new client
- Get connection details

POST /api/client/unregister
- Clean client disconnect
- Trigger auto-shutdown if last
```

### Event System (Node.js)

```javascript
// Server events
server_info    - Initial connection info
server_ready   - Server startup complete
server_shutdown - Server stopping

// Client events
client_registered   - New client connected
client_unregistered - Client disconnected
```

## Best Practices

1. **Server Management**

   - Always use start() to handle server lifecycle
   - Let server auto-shutdown instead of force kill
   - Track owner status for debugging

2. **Error Handling**

   - Check server health before operations
   - Handle process errors gracefully
   - Clean up on process exit

3. **Resource Management**
   - Register/unregister clients properly
   - Clean up connections on exit
   - Use proper shutdown sequence

## Common Issues

1. **Server Not Starting**

   - Check port availability
   - Verify config file path
   - Check mcp-hub installation

2. **Connection Issues**

   - Verify server is running
   - Check port configuration
   - Ensure proper registration

3. **Process Management**
   - Use start()/stop() methods
   - Don't kill server process directly
   - Let auto-shutdown handle cleanup
