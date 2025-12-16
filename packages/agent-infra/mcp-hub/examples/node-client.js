// Example Node.js client for MCP Hub
const EventSource = require("eventsource");
const { spawn } = require("child_process");

class MCPHubClient {
  constructor(port = 3000, config = "~/.config/mcp-hub/config.json") {
    this.port = port;
    this.config = config;
    this.baseUrl = `http://localhost:${port}/api`;
    this.clientId = `node_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.eventSource = null;
    this.ready = false;
    this.serverProcess = null;
    this.isOwner = false;
  }

  // Check server health
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return data.status === "ok";
    } catch (error) {
      return false;
    }
  }

  // Start server or connect to existing
  async start() {
    try {
      // Check if server is already running
      if (await this.checkHealth()) {
        console.log("MCP Hub server already running");
        return this.register();
      }

      // Start new server
      console.log("Starting MCP Hub server...");
      this.isOwner = true;
      return new Promise((resolve, reject) => {
        this.serverProcess = spawn("mcp-hub", [
          "--port",
          this.port.toString(),
          "--config",
          this.config,
        ]);

        // Handle server stdout
        this.serverProcess.stdout.on("data", (data) => {
          const str = data.toString();
          if (str.includes('"status":"ready"')) {
            // Server is ready, register client
            this.register()
              .then(() => resolve(true))
              .catch(reject);
          }
        });

        // Handle server errors
        this.serverProcess.stderr.on("data", (data) => {
          console.error("Server error:", data.toString());
        });

        this.serverProcess.on("error", (err) => {
          console.error("Failed to start server:", err);
          reject(err);
        });
      });
    } catch (error) {
      console.error("Start error:", error);
      return false;
    }
  }

  // Setup SSE event listeners
  setupEventSource() {
    this.eventSource = new EventSource(`${this.baseUrl}/events`);

    // Initial connection info
    this.eventSource.addEventListener("server_info", (event) => {
      const data = JSON.parse(event.data);
      console.log("Connected to server:", data);
      this.ready = true;
    });

    // Server ready event
    this.eventSource.addEventListener("server_ready", (event) => {
      const data = JSON.parse(event.data);
      console.log("Server ready:", data);
    });

    // Server shutdown event
    this.eventSource.addEventListener("server_shutdown", (event) => {
      const data = JSON.parse(event.data);
      console.log("Server shutting down:", data);
      this.ready = false;
      this.eventSource = null;
    });

    // Client events
    this.eventSource.addEventListener("client_registered", (event) => {
      const data = JSON.parse(event.data);
      console.log("Client registered:", data);
    });

    this.eventSource.addEventListener("client_unregistered", (event) => {
      const data = JSON.parse(event.data);
      console.log("Client unregistered:", data);
    });

    // Error handling
    this.eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      this.ready = false;
    };
  }

  // Register with server
  async register() {
    const response = await fetch(`${this.baseUrl}/client/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: this.clientId }),
    });

    if (!response.ok) {
      throw new Error("Failed to register client");
    }

    // Setup event source after registration
    this.setupEventSource();
    return true;
  }

  // Stop connection and cleanup
  async stop() {
    if (this.ready) {
      try {
        await fetch(`${this.baseUrl}/client/unregister`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId: this.clientId }),
        });
      } catch (error) {
        console.error("Error unregistering:", error);
      }
    }

    // Clean up event source
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.ready = false;
    this.isOwner = false;
  }

  // Get server status
  async getStatus() {
    const response = await fetch(`${this.baseUrl}/servers`);
    return await response.json();
  }

  // Call a tool on a server
  async callTool(serverName, toolName, args = {}) {
    if (!this.ready) {
      throw new Error("Not connected to server");
    }

    const response = await fetch(
      `${this.baseUrl}/servers/${serverName}/tools`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: toolName,
          arguments: args,
        }),
      }
    );

    return await response.json();
  }

  // Access a resource
  async accessResource(serverName, uri) {
    if (!this.ready) {
      throw new Error("Not connected to server");
    }

    const response = await fetch(
      `${this.baseUrl}/servers/${serverName}/resources`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri }),
      }
    );

    return await response.json();
  }
}

// Example usage
async function main() {
  const client = new MCPHubClient(3000);

  try {
    // Start server or connect to existing
    console.log("Starting MCP Hub...");
    await client.start();

    // Get server status
    const status = await client.getStatus();
    console.log("Server status:", status);

    // Example tool call
    const result = await client.callTool("example-server", "example-tool", {
      param: "value",
    });
    console.log("Tool result:", result);

    // Clean stop
    await client.stop();
  } catch (error) {
    console.error("Error:", error);
    await client.stop();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MCPHubClient;
