import SwiftUI
import Core

public struct ChatView: View {
    @State private var taskInput = ""
    @State private var isRunning = false
    var onSubmit: (String) async -> Void

    public init(onSubmit: @escaping (String) async -> Void) {
        self.onSubmit = onSubmit
    }

    public var body: some View {
        NavigationStack {
            VStack {
                Spacer()

                VStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 48))
                        .foregroundStyle(.tint)
                    Text("What would you like me to do?")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                HStack(spacing: 12) {
                    TextField("Describe a task...", text: $taskInput, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...4)
                        .disabled(isRunning)

                    Button {
                        let task = taskInput
                        taskInput = ""
                        isRunning = true
                        Task {
                            await onSubmit(task)
                            isRunning = false
                        }
                    } label: {
                        Image(systemName: isRunning ? "stop.circle.fill" : "arrow.up.circle.fill")
                            .font(.title2)
                    }
                    .disabled(taskInput.trimmingCharacters(in: .whitespaces).isEmpty && !isRunning)
                }
                .padding()
            }
            .navigationTitle("UI-TARS")
        }
    }
}
