import SwiftUI
import Core

public struct SettingsView: View {
    @State private var apiEndpoint = "https://api.openai.com/v1"
    @State private var apiKey = ""
    @State private var modelName = "gpt-4o"
    @State private var maxSteps = 50
    @State private var useOnDeviceModel = false

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                Section("Model Provider") {
                    Toggle("On-Device (CoreML)", isOn: $useOnDeviceModel)

                    if !useOnDeviceModel {
                        TextField("API Endpoint", text: $apiEndpoint)
                            .textContentType(.URL)
                            .autocorrectionDisabled()
                        SecureField("API Key", text: $apiKey)
                        TextField("Model Name", text: $modelName)
                            .autocorrectionDisabled()
                    }
                }

                Section("Agent") {
                    Stepper("Max Steps: \(maxSteps)", value: $maxSteps, in: 10...200, step: 10)
                }

                Section("MCP Servers") {
                    // TODO: List configured MCP servers
                    Text("No servers configured")
                        .foregroundStyle(.secondary)
                    Button("Add Server") {
                        // TODO: Add MCP server sheet
                    }
                }

                Section("About") {
                    LabeledContent("Version", value: "0.1.0")
                    LabeledContent("Based on", value: "UI-TARS Desktop")
                }
            }
            .navigationTitle("Settings")
        }
    }
}
