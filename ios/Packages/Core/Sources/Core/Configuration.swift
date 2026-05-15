import Foundation

public struct AgentConfiguration: Sendable {
    public var modelProvider: ModelProvider
    public var maxSteps: Int
    public var stepTimeout: TimeInterval
    public var captureScale: Double
    public var mcpServers: [MCPServerConfig]

    public init(
        modelProvider: ModelProvider = .api(endpoint: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o"),
        maxSteps: Int = 50,
        stepTimeout: TimeInterval = 30,
        captureScale: Double = 1.0,
        mcpServers: [MCPServerConfig] = []
    ) {
        self.modelProvider = modelProvider
        self.maxSteps = maxSteps
        self.stepTimeout = stepTimeout
        self.captureScale = captureScale
        self.mcpServers = mcpServers
    }
}

public enum ModelProvider: Sendable {
    case api(endpoint: String, apiKey: String, model: String)
    case coreML(modelName: String)
}

public struct MCPServerConfig: Sendable, Identifiable {
    public let id: String
    public var name: String
    public var transport: MCPTransportType
    public var enabled: Bool

    public init(id: String = UUID().uuidString, name: String, transport: MCPTransportType, enabled: Bool = true) {
        self.id = id
        self.name = name
        self.transport = transport
        self.enabled = enabled
    }
}

public enum MCPTransportType: Sendable {
    case stdio(command: String, args: [String])
    case http(url: URL)
}
