// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "UITarsIOS",
    platforms: [.iOS(.v17)],
    products: [
        .library(name: "Core", targets: ["Core"]),
        .library(name: "Operators", targets: ["Operators"]),
        .library(name: "MCPClient", targets: ["MCPClient"]),
        .library(name: "ActionParser", targets: ["ActionParser"]),
        .library(name: "Visualizer", targets: ["Visualizer"]),
        .library(name: "AgentUI", targets: ["AgentUI"]),
    ],
    targets: [
        .target(name: "Core", path: "Packages/Core/Sources/Core"),
        .target(name: "ActionParser", dependencies: ["Core"], path: "Packages/ActionParser/Sources/ActionParser"),
        .target(name: "Operators", dependencies: ["Core", "ActionParser"], path: "Packages/Operators/Sources/Operators"),
        .target(name: "MCPClient", dependencies: ["Core"], path: "Packages/MCPClient/Sources/MCPClient"),
        .target(name: "Visualizer", dependencies: ["Core"], path: "Packages/Visualizer/Sources/Visualizer"),
        .target(name: "AgentUI", dependencies: ["Core", "Operators", "MCPClient", "Visualizer"], path: "Packages/AgentUI/Sources/AgentUI"),
    ]
)
