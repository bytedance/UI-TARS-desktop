import Foundation
import Core

public protocol ActionParserProtocol: Sendable {
    func parse(_ modelOutput: String) throws -> AgentAction
}

public struct ActionParser: ActionParserProtocol, Sendable {
    public init() {}

    public func parse(_ modelOutput: String) throws -> AgentAction {
        let trimmed = modelOutput.trimmingCharacters(in: .whitespacesAndNewlines)

        // Expected format from model: "action_type(params)" with optional "thought: ..."
        var reasoning: String?
        var actionStr = trimmed

        if let thoughtRange = trimmed.range(of: "thought:", options: .caseInsensitive) {
            let afterThought = trimmed[thoughtRange.upperBound...]
            if let newline = afterThought.firstIndex(of: "\n") {
                reasoning = String(afterThought[..<newline]).trimmingCharacters(in: .whitespaces)
                actionStr = String(afterThought[afterThought.index(after: newline)...])
            }
        }

        let actionType = try parseActionType(actionStr)
        return AgentAction(type: actionType, reasoning: reasoning)
    }

    private func parseActionType(_ str: String) throws -> ActionType {
        let lower = str.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)

        if lower.hasPrefix("tap(") || lower.hasPrefix("click(") {
            let coords = try extractCoords(from: str)
            return .tap(x: coords.0, y: coords.1)
        } else if lower.hasPrefix("swipe(") || lower.hasPrefix("drag(") {
            let nums = try extractNumbers(from: str, expected: 4)
            return .swipe(fromX: nums[0], fromY: nums[1], toX: nums[2], toY: nums[3])
        } else if lower.hasPrefix("type(") || lower.hasPrefix("text(") {
            let text = try extractString(from: str)
            return .type(text: text)
        } else if lower.hasPrefix("scroll(") {
            let parts = str.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            guard parts.count >= 3 else { throw AgentError.actionParseError("scroll needs x, y, direction") }
            let nums = try extractNumbers(from: str, expected: 2)
            let dirStr = parts.last?.replacingOccurrences(of: ")", with: "").trimmingCharacters(in: .whitespaces).lowercased() ?? "down"
            let dir = ScrollDirection(rawValue: dirStr) ?? .down
            return .scroll(x: nums[0], y: nums[1], direction: dir)
        } else if lower.hasPrefix("long_press(") || lower.hasPrefix("longpress(") {
            let coords = try extractCoords(from: str)
            return .longPress(x: coords.0, y: coords.1)
        } else if lower.hasPrefix("wait(") {
            let nums = try extractNumbers(from: str, expected: 1)
            return .wait(duration: nums[0])
        } else if lower == "screenshot" || lower == "screenshot()" {
            return .screenshot
        } else if lower == "back" || lower == "back()" {
            return .back
        } else if lower == "home" || lower == "home()" {
            return .home
        }

        throw AgentError.actionParseError("Unknown action: \(str)")
    }

    private func extractCoords(from str: String) throws -> (Double, Double) {
        let nums = try extractNumbers(from: str, expected: 2)
        return (nums[0], nums[1])
    }

    private func extractNumbers(from str: String, expected: Int) throws -> [Double] {
        let pattern = #"-?\d+\.?\d*"#
        let regex = try NSRegularExpression(pattern: pattern)
        let matches = regex.matches(in: str, range: NSRange(str.startIndex..., in: str))
        let numbers = matches.compactMap { match -> Double? in
            guard let range = Range(match.range, in: str) else { return nil }
            return Double(str[range])
        }
        guard numbers.count >= expected else {
            throw AgentError.actionParseError("Expected \(expected) numbers, got \(numbers.count)")
        }
        return numbers
    }

    private func extractString(from str: String) throws -> String {
        // Extract content between quotes or parentheses
        if let quoteStart = str.firstIndex(of: "\""), let quoteEnd = str[str.index(after: quoteStart)...].firstIndex(of: "\"") {
            return String(str[str.index(after: quoteStart)..<quoteEnd])
        }
        if let parenStart = str.firstIndex(of: "("), let parenEnd = str.lastIndex(of: ")") {
            return String(str[str.index(after: parenStart)..<parenEnd]).trimmingCharacters(in: .whitespaces)
        }
        throw AgentError.actionParseError("Could not extract string from: \(str)")
    }
}
