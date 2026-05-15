import Foundation
import Core

public struct MCPTool: Sendable, Identifiable {
    public let id: String
    public let name: String
    public let description: String
    public let inputSchema: [String: Any]?

    public init(id: String = UUID().uuidString, name: String, description: String, inputSchema: [String: Any]? = nil) {
        self.id = id
        self.name = name
        self.description = description
        self.inputSchema = inputSchema
    }
}

public struct MCPResource: Sendable, Identifiable {
    public let id: String
    public let uri: String
    public let name: String
    public let mimeType: String?
}

public struct MCPToolResult: Sendable {
    public let content: String
    public let isError: Bool

    public init(content: String, isError: Bool = false) {
        self.content = content
        self.isError = isError
    }
}

public protocol MCPClientProtocol: Sendable {
    func connect() async throws
    func disconnect() async
    func listTools() async throws -> [MCPTool]
    func callTool(name: String, arguments: [String: Any]) async throws -> MCPToolResult
    func listResources() async throws -> [MCPResource]
    func readResource(uri: String) async throws -> String
}
