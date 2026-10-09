import SwiftUI
import Core

public struct ActionOverlayView: View {
    let actions: [AgentAction]
    let screenSize: CGSize

    public init(actions: [AgentAction], screenSize: CGSize) {
        self.actions = actions
        self.screenSize = screenSize
    }

    public var body: some View {
        Canvas { context, size in
            for action in actions {
                switch action.type {
                case .tap(let x, let y), .doubleTap(let x, let y):
                    let point = CGPoint(x: x * size.width, y: y * size.height)
                    let rect = CGRect(x: point.x - 20, y: point.y - 20, width: 40, height: 40)
                    context.stroke(Path(ellipseIn: rect), with: .color(.red), lineWidth: 3)
                    context.fill(Path(ellipseIn: rect.insetBy(dx: 12, dy: 12)), with: .color(.red.opacity(0.5)))

                case .longPress(let x, let y, _):
                    let point = CGPoint(x: x * size.width, y: y * size.height)
                    let rect = CGRect(x: point.x - 25, y: point.y - 25, width: 50, height: 50)
                    context.stroke(Path(ellipseIn: rect), with: .color(.orange), style: StrokeStyle(lineWidth: 3, dash: [6, 3]))

                case .swipe(let fx, let fy, let tx, let ty):
                    var path = Path()
                    path.move(to: CGPoint(x: fx * size.width, y: fy * size.height))
                    path.addLine(to: CGPoint(x: tx * size.width, y: ty * size.height))
                    context.stroke(path, with: .color(.blue), lineWidth: 3)

                case .type(let text):
                    let resolved = context.resolve(Text(text).font(.caption).foregroundColor(.green))
                    context.draw(resolved, at: CGPoint(x: size.width / 2, y: 30))

                default:
                    break
                }
            }
        }
        .allowsHitTesting(false)
        .ignoresSafeArea()
    }
}
