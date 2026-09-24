import Foundation

public enum ActionType: Sendable, Equatable {
    case tap(x: Double, y: Double)
    case doubleTap(x: Double, y: Double)
    case longPress(x: Double, y: Double, duration: TimeInterval = 1.0)
    case swipe(fromX: Double, fromY: Double, toX: Double, toY: Double)
    case scroll(x: Double, y: Double, direction: ScrollDirection, amount: Double = 1.0)
    case type(text: String)
    case keyPress(key: String)
    case wait(duration: TimeInterval)
    case screenshot
    case openApp(bundleId: String)
    case back
    case home
}

public enum ScrollDirection: String, Sendable {
    case up, down, left, right
}

public struct AgentAction: Sendable {
    public let type: ActionType
    public let reasoning: String?
    public let timestamp: Date

    public init(type: ActionType, reasoning: String? = nil, timestamp: Date = .now) {
        self.type = type
        self.reasoning = reasoning
        self.timestamp = timestamp
    }
}
