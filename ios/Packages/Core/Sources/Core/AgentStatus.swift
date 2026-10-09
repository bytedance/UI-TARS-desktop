import Foundation

public enum AgentStatus: Sendable, Equatable {
    case idle
    case starting
    case capturingScreen
    case thinkingWithModel
    case parsingAction
    case executingAction(ActionType)
    case verifyingResult
    case completed(summary: String)
    case failed(error: String)
    case paused
    case cancelled

    public var isRunning: Bool {
        switch self {
        case .starting, .capturingScreen, .thinkingWithModel,
             .parsingAction, .executingAction, .verifyingResult:
            return true
        default:
            return false
        }
    }

    public var isTerminal: Bool {
        switch self {
        case .completed, .failed, .cancelled:
            return true
        default:
            return false
        }
    }
}
