import Foundation
import Core
import UIKit
import WebKit

public actor BrowserOperator: OperatorProtocol {
    public nonisolated let name = "BrowserOperator"
    private var webView: WKWebView?

    public init() {}

    public func captureScreen() async throws -> UIImage {
        guard let webView else {
            throw AgentError.operatorError("WebView not initialized")
        }
        let config = WKSnapshotConfiguration()
        return try await webView.takeSnapshot(configuration: config)
    }

    public func executeAction(_ action: ActionType) async throws {
        guard let webView else {
            throw AgentError.operatorError("WebView not initialized")
        }
        switch action {
        case .tap(let x, let y):
            let js = "document.elementFromPoint(\(x), \(y))?.click();"
            _ = try await webView.evaluateJavaScript(js)
        case .type(let text):
            let escaped = text.replacingOccurrences(of: "'", with: "\\'")
            let js = "document.activeElement.value = '\(escaped)'; document.activeElement.dispatchEvent(new Event('input'));"
            _ = try await webView.evaluateJavaScript(js)
        case .scroll(_, _, let direction, let amount):
            let (dx, dy): (Double, Double) = switch direction {
            case .up: (0, -amount * 200)
            case .down: (0, amount * 200)
            case .left: (-amount * 200, 0)
            case .right: (amount * 200, 0)
            }
            _ = try await webView.evaluateJavaScript("window.scrollBy(\(dx), \(dy));")
        default:
            throw AgentError.operatorError("Action \(action) not supported in browser")
        }
    }

    public func isAvailable() async -> Bool { true }

    public func setWebView(_ webView: WKWebView) {
        self.webView = webView
    }

    public func navigate(to url: URL) async throws {
        guard let webView else {
            throw AgentError.operatorError("WebView not initialized")
        }
        webView.load(URLRequest(url: url))
    }
}
