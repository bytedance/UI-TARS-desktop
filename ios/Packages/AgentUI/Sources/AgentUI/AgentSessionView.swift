import SwiftUI
import Core
import Visualizer

public struct AgentSessionView: View {
    let session: AgentSession
    @State private var showOverlay = true

    public init(session: AgentSession) {
        self.session = session
    }

    public var body: some View {
        ZStack {
            VStack(spacing: 0) {
                // Status bar
                HStack {
                    statusBadge
                    Spacer()
                    Text("Step \(session.stepCount)")
                        .font(.caption)
                        .monospacedDigit()
                    Toggle("Overlay", isOn: $showOverlay)
                        .toggleStyle(.button)
                        .font(.caption)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)

                // Screen capture placeholder
                Rectangle()
                    .fill(Color(uiColor: .systemGray6))
                    .overlay {
                        Text("Screen capture will appear here")
                            .foregroundStyle(.secondary)
                    }

                // Action log
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(session.actions.enumerated()), id: \.offset) { idx, action in
                            HStack(alignment: .top) {
                                Text("#\(idx + 1)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 30)
                                VStack(alignment: .leading) {
                                    Text(String(describing: action.type))
                                        .font(.caption)
                                        .fontDesign(.monospaced)
                                    if let reasoning = action.reasoning {
                                        Text(reasoning)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                    .padding()
                }
                .frame(maxHeight: 200)
            }

            if showOverlay {
                ActionOverlayView(
                    actions: session.actions,
                    screenSize: UIScreen.main.bounds.size
                )
            }
        }
        .navigationTitle(session.task)
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private var statusBadge: some View {
        let (text, color): (String, Color) = switch session.status {
        case .idle: ("Idle", .gray)
        case .starting: ("Starting", .blue)
        case .capturingScreen: ("Capturing", .cyan)
        case .thinkingWithModel: ("Thinking", .purple)
        case .parsingAction: ("Parsing", .indigo)
        case .executingAction: ("Executing", .orange)
        case .verifyingResult: ("Verifying", .yellow)
        case .completed: ("Done", .green)
        case .failed: ("Failed", .red)
        case .paused: ("Paused", .gray)
        case .cancelled: ("Cancelled", .red)
        }
        Text(text)
            .font(.caption2.bold())
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.2))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
}
