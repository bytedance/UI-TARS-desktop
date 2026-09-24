import Foundation

public protocol AgentOrchestratorProtocol: Sendable {
    var status: AgentStatus { get async }
    func start(task: String) async throws -> AgentSession
    func pause() async
    func resume() async
    func cancel() async
}

public struct AgentSession: Sendable, Identifiable {
    public let id: String
    public let task: String
    public let startedAt: Date
    public var actions: [AgentAction]
    public var status: AgentStatus
    public var stepCount: Int

    public init(id: String = UUID().uuidString, task: String) {
        self.id = id
        self.task = task
        self.startedAt = .now
        self.actions = []
        self.status = .starting
        self.stepCount = 0
    }
}

public actor AgentOrchestrator: AgentOrchestratorProtocol {
    private let config: AgentConfiguration
    private var currentSession: AgentSession?
    private var _status: AgentStatus = .idle

    public var status: AgentStatus { _status }

    public init(config: AgentConfiguration) {
        self.config = config
    }

    public func start(task: String) async throws -> AgentSession {
        var session = AgentSession(task: task)
        _status = .starting
        currentSession = session

        for step in 0..<config.maxSteps {
            guard !_status.isTerminal else { break }
            guard _status != .paused else {
                try await Task.sleep(for: .milliseconds(500))
                continue
            }

            // 1. Capture screen
            _status = .capturingScreen
            // TODO: Call operator.captureScreen()

            // 2. Send to model
            _status = .thinkingWithModel
            // TODO: Call model provider

            // 3. Parse action
            _status = .parsingAction
            // TODO: Call action parser

            // 4. Execute action
            // _status = .executingAction(action)
            // TODO: Call operator.executeAction()

            // 5. Verify
            _status = .verifyingResult
            // TODO: Check if task complete

            session.stepCount = step + 1
        }

        if session.stepCount >= config.maxSteps {
            _status = .failed(error: "Max steps exceeded")
            throw AgentError.maxStepsExceeded(config.maxSteps)
        }

        _status = .completed(summary: "Task completed in \(session.stepCount) steps")
        currentSession = session
        return session
    }

    public func pause() async { _status = .paused }
    public func resume() async { _status = .capturingScreen }
    public func cancel() async { _status = .cancelled }
}
