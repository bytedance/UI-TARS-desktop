# Agent TARS Server

Agent TARS Server 是 Agent TARS 的服务器组件，提供了 Web API 和 WebSocket 接口，使 AI Agent 能够作为服务进行部署和交互。

## 功能特点

- **会话管理**：创建和管理 Agent TARS 会话
- **HTTP API**：RESTful API 用于基本的 Agent 交互
- **WebSocket 支持**：实时推送 Agent 事件和状态更新
- **流式响应**：支持大型语言模型的流式输出
- **内置 UI**：提供简洁的 Web 界面进行交互
- **工作区隔离**：可选的会话工作区隔离

## 架构

Agent TARS Server 由以下主要组件构成：

- **AgentTARSServer**：主服务器类，负责 HTTP 和 WebSocket 服务
- **AgentSession**：管理单个 Agent 会话的生命周期
- **EventStreamBridge**：在 Agent 的事件流和客户端之间建立桥接
- **WorkspacePathManager**：管理工作目录路径解析和创建

服务器使用 Express.js 提供 HTTP 接口，同时使用 Socket.IO 实现 WebSocket 通信。

## API 接口

### 会话管理

- **POST /api/sessions/create** - 创建新会话
  - 返回：`{ sessionId: string }`

### 查询接口

- **POST /api/sessions/:sessionId/query** - 向会话发送查询（非流式）
  - 请求体：`{ query: string }`
  - 返回：`{ result: string }`

- **POST /api/sessions/query** - 统一查询接口（非流式）
  - 请求体：`{ sessionId: string, query: string }`
  - 返回：`{ result: string }`

- **POST /api/sessions/query/stream** - 流式查询接口
  - 请求体：`{ sessionId: string, query: string }`
  - 返回：Server-Sent Events 流，每个事件包含 Agent 事件

### WebSocket 事件

- **join-session**：客户端发送以加入特定会话
- **send-query**：发送查询到 Agent
- **agent-event**：服务器发送 Agent 事件更新

## 使用方法

### 安装

```bash
npm install @agent-tars/server
