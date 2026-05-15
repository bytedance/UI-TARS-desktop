import Foundation
import Core
import UIKit

public protocol OperatorProtocol: Sendable {
    var name: String { get }
    func captureScreen() async throws -> UIImage
    func executeAction(_ action: ActionType) async throws
    func isAvailable() async -> Bool
}
