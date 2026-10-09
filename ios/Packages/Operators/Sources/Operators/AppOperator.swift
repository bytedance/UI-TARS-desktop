import Foundation
import Core
import UIKit

public actor AppOperator: OperatorProtocol {
    public nonisolated let name = "AppOperator"

    public init() {}

    public func captureScreen() async throws -> UIImage {
        // iOS sandboxing limits full screen capture.
        // Uses the app's own key window as fallback.
        guard let scene = await UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = await scene.keyWindow else {
            throw AgentError.screenCaptureError("No active window")
        }
        let renderer = await UIGraphicsImageRenderer(bounds: window.bounds)
        return await renderer.image { ctx in
            window.drawHierarchy(in: window.bounds, afterScreenUpdates: true)
        }
    }

    public func executeAction(_ action: ActionType) async throws {
        // iOS does not allow programmatic touch injection outside of XCUITest.
        // This operator works via Accessibility APIs where available,
        // and falls back to vision-only guidance for the user.
        switch action {
        case .tap, .doubleTap, .longPress, .swipe:
            // TODO: Integrate with iOS Accessibility or enterprise APIs
            throw AgentError.operatorError("Direct touch simulation requires accessibility entitlements")
        case .type(let text):
            UIPasteboard.general.string = text
            // TODO: Paste into active field via accessibility
        case .openApp(let bundleId):
            guard let url = URL(string: "app://\(bundleId)") else {
                throw AgentError.operatorError("Invalid bundle ID")
            }
            await UIApplication.shared.open(url)
        case .home:
            // Cannot programmatically press home on iOS
            throw AgentError.permissionDenied("Home button not accessible")
        default:
            throw AgentError.operatorError("Action not supported in app operator")
        }
    }

    public func isAvailable() async -> Bool { true }
}
