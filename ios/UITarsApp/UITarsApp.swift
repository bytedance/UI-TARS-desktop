import SwiftUI
import Core
import AgentUI

@main
struct UITarsApp: App {
    @State private var sessions: [AgentSession] = []
    @State private var activeSession: AgentSession?

    private let orchestrator = AgentOrchestrator(config: AgentConfiguration())

    var body: some Scene {
        WindowGroup {
            TabView {
                ChatView { task in
                    do {
                        let session = try await orchestrator.start(task: task)
                        sessions.insert(session, at: 0)
                    } catch {
                        print("Agent error: \(error)")
                    }
                }
                .tabItem { Label("Agent", systemImage: "sparkles") }

                HistoryView(sessions: sessions) { session in
                    activeSession = session
                }
                .tabItem { Label("History", systemImage: "clock") }

                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gear") }
            }
        }
    }
}
