import Foundation
import Core

public actor MCPClient: MCPClientProtocol {
    private let config: MCPServerConfig
    private var transport: (any MCPTransport)?
    private var isConnected = false

    public init(config: MCPServerConfig) {
        self.config = config
    }

    public func connect() async throws {
        switch config.transport {
        case .http(let url):
            transport = HTTPTransport(url: url)
        case .stdio:
            // TODO: Implement stdio transport for iOS (limited by sandbox)
            throw AgentError.mcpError("stdio transport not available on iOS")
        }
        // TODO: Send initialize JSON-RPC message
        isConnected = true
    }

    public func disconnect() async {
        await transport?.close()
        isConnected = false
    }

    public func listTools() async throws -> [MCPTool] {
        guard isConnected else { throw AgentError.mcpError("Not connected") }
        // TODO: Send tools/list JSON-RPC request
        return []
    }

    public func callTool(name: String, arguments: [String: Any]) async throws -> MCPToolResult {
        guard isConnected else { throw AgentError.mcpError("Not connected") }
        // TODO: Send tools/call JSON-RPC request
        return MCPToolResult(content: "", isError: true)
    }

    public func listResources() async throws -> [MCPResource] {
        guard isConnected else { throw AgentError.mcpError("Not connected") }
        // TODO: Send resources/list JSON-RPC request
        return []
    }

    public func readResource(uri: String) async throws -> String {
        guard isConnected else { throw AgentError.mcpError("Not connected") }
        // TODO: Send resources/read JSON-RPC request
        return ""
    }
}
