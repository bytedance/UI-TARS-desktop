import Foundation

public protocol MCPTransport: Sendable {
    func send(_ data: Data) async throws
    func receive() async throws -> Data
    func close() async
}

public actor HTTPTransport: MCPTransport {
    private let url: URL
    private let session: URLSession

    public init(url: URL) {
        self.url = url
        self.session = .shared
    }

    public func send(_ data: Data) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.httpBody = data
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let (responseData, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        // Store response for receive()
        _lastResponse = responseData
    }

    private var _lastResponse: Data?

    public func receive() async throws -> Data {
        guard let data = _lastResponse else {
            throw URLError(.cannotParseResponse)
        }
        _lastResponse = nil
        return data
    }

    public func close() async {
        // HTTP is stateless, nothing to close
    }
}
