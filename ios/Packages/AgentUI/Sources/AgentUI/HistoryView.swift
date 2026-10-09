import SwiftUI
import Core

public struct HistoryView: View {
    let sessions: [AgentSession]
    var onSelect: (AgentSession) -> Void

    public init(sessions: [AgentSession], onSelect: @escaping (AgentSession) -> Void) {
        self.sessions = sessions
        self.onSelect = onSelect
    }

    public var body: some View {
        NavigationStack {
            Group {
                if sessions.isEmpty {
                    ContentUnavailableView(
                        "No Sessions Yet",
                        systemImage: "clock",
                        description: Text("Completed agent sessions will appear here.")
                    )
                } else {
                    List(sessions) { session in
                        Button { onSelect(session) } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(session.task)
                                        .font(.body)
                                        .lineLimit(2)
                                    Text("\(session.stepCount) steps")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Text(session.startedAt, style: .relative)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("History")
        }
    }
}
