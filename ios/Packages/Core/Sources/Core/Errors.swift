import Foundation

public enum AgentError: Error, LocalizedError, Sendable {
    case maxStepsExceeded(Int)
    case stepTimeout(TimeInterval)
    case modelError(String)
    case actionParseError(String)
    case operatorError(String)
    case screenCaptureError(String)
    case mcpError(String)
    case permissionDenied(String)
    case cancelled

    public var errorDescription: String? {
        switch self {
        case .maxStepsExceeded(let n): "Agent exceeded maximum steps (\(n))"
        case .stepTimeout(let t): "Step timed out after \(t)s"
        case .modelError(let msg): "Model error: \(msg)"
        case .actionParseError(let msg): "Failed to parse action: \(msg)"
        case .operatorError(let msg): "Operator error: \(msg)"
        case .screenCaptureError(let msg): "Screen capture failed: \(msg)"
        case .mcpError(let msg): "MCP error: \(msg)"
        case .permissionDenied(let msg): "Permission denied: \(msg)"
        case .cancelled: "Agent was cancelled"
        }
    }
}
