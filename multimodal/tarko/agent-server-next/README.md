# Agent Server Next 技术文档

## 项目概述

`@tarko/agent-server-next` 是基于 Hono 框架的新一代 Agent 服务器实现，旨在替换原有基于 Express 的 `agent-server`。该项目保持所有核心功能的同时，提供更好的性能、类型安全和现代化的架构设计。

## 项目背景与目标

### 迁移动机

1. **性能优化**: Hono 框架提供更好的性能表现
2. **类型安全**: 更好的 TypeScript 支持和类型推导
3. **现代化架构**: 采用最新的 Web 标准和最佳实践
4. **简化部署**: 移除 WebSocket 依赖，简化部署复杂度
5. **存储优化**: 精简存储提供者，专注核心场景

### 核心要求

- ✅ 保持与原 `agent-server` 的功能等价性
- ✅ 使用 Hono 框架替代 Express
- ✅ 移除 WebSocket/Socket.IO 支持
- ✅ 保留 MongoDB 和 SQLite 存储提供者
- ✅ 保持会话管理和中间件功能
- ✅ 支持本地和云端部署
- ✅ 保持 AgentServer 类的构造函数接口兼容性
- ❌ 排除 Agent-CLI 集成（明确排除）

## 技术栈选择

### 核心框架

| 技术         | 选择        | 原因                         |
| ------------ | ----------- | ---------------------------- |
| **Web 框架** | Hono        | 高性能、类型安全、现代化 API |
| **运行时**   | Node.js 22+ | 与现有生态兼容               |
| **构建工具** | Rslib       | 提供优秀的 TypeScript 支持   |
| **包管理**   | pnpm        | 符合项目现有标准             |

### 存储层

| 存储类型    | 实现        | 用途                       |
| ----------- | ----------- | -------------------------- |
| **MongoDB** | Mongoose    | 生产环境推荐，支持复杂查询 |
| **SQLite**  | node:sqlite | 开发环境和轻量级部署       |

### 开发工具

- **TypeScript** - 类型安全和开发体验
- **ESLint** - 代码质量保证
- **Prettier** - 代码格式化
- **Vitest** - 测试框架（计划中）

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Hono Application                     │
├─────────────────────────────────────────────────────────┤
│  Middlewares (Request ID, Logging, Error Handling)     │
├─────────────────────────────────────────────────────────┤
│  API Routes (Queries, Sessions, Share, System)         │
├─────────────────────────────────────────────────────────┤
│           AgentServer (Core Orchestrator)              │
├─────────────────┬─────────────────┬─────────────────────┤
│   AgentSession  │  EventStream    │  Storage Providers  │
│   Management    │     Bridge      │   (MongoDB/SQLite)  │
├─────────────────┼─────────────────┼─────────────────────┤
│                 │  Agent Runtime  │     Monitoring      │
│                 │  (IAgent Impl)  │   (AGIO Provider)   │
└─────────────────┴─────────────────┴─────────────────────┘
```

### 核心组件

#### 1. AgentServer 类

- **职责**: 服务器生命周期管理、会话协调、配置管理
- **特点**: 保持与原版构造函数兼容、支持泛型配置
- **关键方法**: `start()`, `stop()`, `createAgent()`, `createAgentWithSessionModel()`

#### 2. AgentSession 类

- **职责**: 单个代理会话的生命周期管理
- **特点**: 事件流桥接、存储集成、AGIO 监控
- **关键方法**: `runQuery()`, `runQueryStreaming()`, `abortQuery()`, `cleanup()`

#### 3. EventStreamBridge 类

- **职责**: 事件流转换和客户端通信
- **特点**: 发布-订阅模式、客户端友好的事件格式
- **核心功能**: 将 Agent 原生事件转换为客户端可用格式

#### 4. 存储提供者

- **MongoDB**: 生产环境推荐，支持复杂会话管理
- **SQLite**: 开发环境和单机部署友好

### 中间件架构

```
Request → Error Handling → Request ID → Logging → Server Injection → Routes
```

1. **Error Handling**: 全局错误捕获和格式化
2. **Request ID**: 请求追踪和日志关联
3. **Logging**: 访问日志和性能监控
4. **Server Injection**: 将 AgentServer 实例注入上下文

## 实现过程

### 第一阶段：项目结构搭建

#### 1. 项目初始化

```bash
# 创建项目目录
mkdir agent-server-next
cd agent-server-next

# 初始化 package.json
pnpm init

# 安装核心依赖
pnpm add hono @hono/node-server
pnpm add @tarko/interface @tarko/shared-utils
```

#### 2. 目录结构设计

```
src/
├── core/                 # 核心组件
│   ├── AgentSession.ts   # 会话管理
│   └── index.ts          # 导出
├── middlewares/          # Hono 中间件
│   ├── error-handling.ts # 错误处理
│   ├── exclusive-mode.ts # 独占模式
│   ├── logging.ts        # 日志记录
│   ├── request-id.ts     # 请求 ID
│   ├── session-restore.ts# 会话恢复
│   └── index.ts          # 导出
├── storage/              # 存储提供者
│   ├── MongoDBStorageProvider/
│   ├── SQLiteStorageProvider.ts
│   ├── types.ts          # 存储接口
│   └── index.ts          # 工厂函数
├── utils/                # 工具函数
│   ├── agent-resolver.ts # Agent 解析
│   ├── error-handler.ts  # 错误处理
│   └── event-stream.ts   # 事件流
├── server.ts             # 主服务器类
├── types.ts              # 类型定义
└── index.ts              # 入口文件
```

### 第二阶段：核心组件迁移

#### 1. 类型系统设计

**Hono Context 扩展**:

```typescript
export interface ContextVariables {
  server: AgentServer;
  session?: AgentSession;
  requestId?: string;
  startTime?: number;
}

export type HonoContext = Context<{ Variables: ContextVariables }>;
```

**AgentServer 接口**:

```typescript
export interface AgentServer<T extends AgentAppConfig = AgentAppConfig> {
  // 核心组件
  readonly port: number;
  readonly isDebug: boolean;
  readonly isExclusive: boolean;
  readonly storageProvider: StorageProvider | null;
  readonly appConfig: T;

  // 生命周期
  start(): Promise<void>;
  stop(): Promise<void>;
  isServerRunning(): boolean;

  // Agent 管理
  createAgent(): IAgent;
  createAgentWithSessionModel(sessionInfo?: any): IAgent;

  // 会话管理
  sessions: Record<string, AgentSession>;
  canAcceptNewRequest(): boolean;
  setRunningSession(sessionId: string): void;
  clearRunningSession(sessionId: string): void;
}
```

#### 2. 存储层迁移

**MongoDB 存储提供者**:

- 保持原有 Mongoose Schema 设计
- 支持会话信息和事件存储
- 实现连接池和错误重试机制

**SQLite 存储提供者**:

- 使用 Node.js 内置 `node:sqlite` 模块
- 轻量级设计，适合开发环境
- 支持基本的会话持久化

#### 3. 事件流系统

**EventStreamBridge**:

```typescript
export class EventStreamBridge {
  private subscribers: Set<(type: string, data: any) => void> = new Set();

  subscribe(handler: (type: string, data: any) => void): void;
  unsubscribe(handler: (type: string, data: any) => void): void;
  emit(type: string, data: any): void;
  connectToAgentEventStream(agentEventStream: AgentEventStream.Processor): () => void;
}
```

**关键特性**:

- 发布-订阅模式的事件分发
- Agent 原生事件到客户端事件的转换
- 支持 TTFT (Time To First Token) 跟踪
- 状态管理和进度报告

### 第三阶段：中间件系统

#### 1. 错误处理中间件

```typescript
export async function errorHandlingMiddleware(c: HonoContext, next: Next) {
  try {
    await next();
  } catch (error) {
    const requestId = c.get('requestId') || 'unknown';

    if (error instanceof HTTPException) {
      logger.warn(`[${requestId}] HTTP Exception: ${error.status} - ${error.message}`);
      return c.json({ error: error.message, requestId, status: error.status }, error.status);
    }

    logger.error(`[${requestId}] Unhandled error:`, error);
    return c.json(
      {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
        requestId,
        status: 500,
      },
      500,
    );
  }
}
```

#### 2. 会话恢复中间件

```typescript
export async function sessionRestoreMiddleware(
  c: HonoContext,
  next: Next,
): Promise<void | Response> {
  const server = c.get('server');

  const sessionId = c.req.query('sessionId') || (await getSessionIdFromBody(c));
  if (!sessionId) {
    return c.json({ error: 'Session ID is required' }, 400);
  }

  let session = server.sessions[sessionId];

  // 从存储恢复会话
  if (!session && server.storageProvider) {
    const metadata = await server.storageProvider.getSessionInfo(sessionId);
    if (metadata) {
      session = new AgentSession(server, sessionId, server.getCustomAgioProvider(), metadata);
      // ... 初始化逻辑
    }
  }

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  c.set('session', session);
  await next();
}
```

#### 3. 独占模式中间件

```typescript
export async function exclusiveModeMiddleware(
  c: HonoContext,
  next: Next,
): Promise<void | Response> {
  const server = c.get('server');

  if (!server.canAcceptNewRequest()) {
    return c.json(
      {
        error: 'Server is in exclusive mode and another session is currently running',
        runningSessionId: server.getRunningSessionId(),
      },
      409,
    );
  }

  await next();
}
```

### 第四阶段：AgentServer 核心实现

#### 1. 构造函数设计

```typescript
export class AgentServer<T extends AgentAppConfig = AgentAppConfig> {
  private app: Hono<{ Variables: ContextVariables }>;
  private server: any; // Node.js HTTP server

  constructor(
    private appConfig: T,
    versionInfo?: AgentServerVersionInfo,
    directories?: GlobalDirectoryOptions,
  ) {
    // 配置解析
    this.port = appConfig.server?.port ?? 3000;
    this.isDebug = appConfig.logLevel === LogLevel.DEBUG;
    this.isExclusive = appConfig.server?.exclusive ?? false;

    // 初始化 Hono 应用
    this.app = new Hono<{ Variables: ContextVariables }>();

    // 存储初始化
    if (appConfig.server?.storage) {
      this.storageProvider = createStorageProvider(appConfig.server.storage);
    }

    // 设置中间件
    this.setupMiddlewares();
  }
}
```

#### 2. 中间件设置

```typescript
private setupMiddlewares(): void {
  // 1. 错误处理中间件（最先执行以捕获所有错误）
  this.app.use('*', errorHandlingMiddleware);

  // 2. 请求 ID 中间件（用于日志关联）
  this.app.use('*', requestIdMiddleware);

  // 3. 日志中间件（在请求 ID 之后）
  this.app.use('*', loggingMiddleware);

  // 4. 服务器实例注入中间件
  this.app.use('*', async (c, next) => {
    c.set('server', this);
    await next();
  });
}
```

#### 3. 生命周期管理

```typescript
async start(): Promise<void> {
  if (this.isRunning) {
    throw new Error('Server is already running');
  }

  // 解析 Agent 实现
  this.currentAgentResolution = await resolveAgentImplementation(this.appConfig.agent);

  // 设置 API 路由
  this.setupRoutes();

  // 启动 HTTP 服务器
  this.server = serve({
    fetch: this.app.fetch,
    port: this.port,
  });

  this.isRunning = true;
  logger.info(`Agent Server Next started on port ${this.port}`);
}

async stop(): Promise<void> {
  if (!this.isRunning) return;

  // 清理所有会话
  await Promise.all(
    Object.values(this.sessions).map(session => session.cleanup())
  );

  // 停止 HTTP 服务器
  if (this.server && typeof this.server.close === 'function') {
    await this.server.close();
  }

  this.isRunning = false;
  logger.info('Agent Server Next stopped');
}
```

### 第五阶段：会话管理

#### 1. AgentSession 类设计

```typescript
export class AgentSession {
  id: string;
  agent: IAgent;
  eventBridge: EventStreamBridge;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private server: AgentServer,
    sessionId: string,
    agioProviderImpl?: AgioProviderConstructor,
    sessionInfo?: SessionInfo,
  ) {
    this.id = sessionId;
    this.eventBridge = new EventStreamBridge();

    // 创建 Agent 实例
    const agent = server.createAgentWithSessionModel(sessionInfo);

    // 初始化 Agent Snapshot（如果启用）
    if (server.appConfig.snapshot?.enable) {
      // ... Snapshot 初始化逻辑
    }

    this.agent = agent;
  }
}
```

#### 2. 查询执行

```typescript
async runQuery(options: {
  input: string | ChatCompletionContentPart[];
  environmentInput?: {
    content: string;
    description?: string;
    metadata?: Record<string, any>;
  };
}): Promise<AgentQueryResponse> {
  try {
    // 设置独占模式
    if (this.server.isExclusive) {
      this.server.setRunningSession(this.id);
    }

    const result = await this.agent.run(options as AgentRunNonStreamingOptions);
    return { success: true, result };
  } catch (error) {
    const errorResponse = handleAgentError(error);
    return { success: false, error: errorResponse };
  } finally {
    // 清除独占模式
    if (this.server.isExclusive) {
      this.server.clearRunningSession(this.id);
    }
  }
}
```

#### 3. 流式查询

```typescript
async runQueryStreaming(options: {
  input: string | ChatCompletionContentPart[];
  environmentInput?: {
    content: string;
    description?: string;
    metadata?: Record<string, any>;
  };
}): Promise<AsyncIterable<AgentEventStream.Event>> {
  try {
    // 设置独占模式
    if (this.server.isExclusive) {
      this.server.setRunningSession(this.id);
    }

    // 使用流式选项
    const streamingOptions = {
      ...options,
      stream: true,
    } as AgentRunStreamingOptions;

    return await this.agent.run(streamingOptions);
  } catch (error) {
    // 返回错误事件的异步生成器
    const errorResponse = handleAgentError(error);
    return (async function* () {
      yield {
        type: 'system',
        level: 'error',
        message: errorResponse.message || 'Unknown error occurred',
        timestamp: Date.now(),
      } as AgentEventStream.Event;
    })();
  } finally {
    // 清除独占模式
    if (this.server.isExclusive) {
      this.server.clearRunningSession(this.id);
    }
  }
}
```

## 技术挑战与解决方案

### 1. 类型兼容性问题

**问题**: Hono 和 Express 的上下文类型不兼容 **解决方案**:

- 创建 `HonoContext` 类型别名
- 使用 `ContextVariables` 接口扩展 Hono 上下文
- 保持向后兼容的 API 设计

### 2. 中间件迁移

**问题**: Express 中间件模式与 Hono 不直接兼容 **解决方案**:

- 重新实现所有中间件以适配 Hono 的 `async/await` 模式
- 保持中间件的核心业务逻辑不变
- 统一错误处理和响应格式

### 3. 事件流处理

**问题**: IAgent 接口方法签名变化 **解决方案**:

- 使用重载的 `run()` 方法替代 `runStreaming()`
- 通过 `stream: true` 参数控制流式行为
- 保持事件流桥接的兼容性

### 4. 存储抽象

**问题**: 需要支持多种存储后端 **解决方案**:

- 设计统一的 `StorageProvider` 接口
- 实现工厂模式创建存储实例
- 保持现有存储格式的兼容性

## 性能优化

### 1. 构建优化

- 使用 Rslib 进行优化的 TypeScript 编译
- Tree-shaking 移除未使用的代码
- 合理的代码分割策略

### 2. 运行时优化

- Hono 框架的高性能路由匹配
- 最小化中间件开销
- 优化的事件流处理

### 3. 内存管理

- 及时清理过期会话
- 事件监听器的正确清理
- Storage provider 的连接池管理

## 测试策略

### 1. 单元测试（计划中）

- 核心组件的独立测试
- 中间件功能验证
- 存储提供者测试

### 2. 集成测试（计划中）

- API 端点测试
- 端到端会话流程测试
- 错误处理测试

### 3. 性能测试（计划中）

- 并发请求处理能力
- 内存使用情况监控
- 响应时间基准测试

## 部署指南

### 1. 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建项目
pnpm build
```

### 2. 生产环境

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

### 3. Docker 部署

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

## 配置管理

### 1. 环境变量

```bash
# 服务器配置
PORT=3000
NODE_ENV=production

# 存储配置
STORAGE_TYPE=mongodb
MONGODB_URL=mongodb://localhost:27017/agents

# Agent 配置
WORKSPACE_PATH=/app/workspace
LOG_LEVEL=info

# 监控配置
AGIO_PROVIDER=http://agio-server:8080
```

### 2. 配置文件

```typescript
const config: AgentAppConfig = {
  workspace: process.env.WORKSPACE_PATH || process.cwd(),
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  server: {
    port: parseInt(process.env.PORT || '3000'),
    exclusive: process.env.EXCLUSIVE_MODE === 'true',
    storage: {
      type: process.env.STORAGE_TYPE || 'sqlite',
      url: process.env.STORAGE_URL || './agents.db',
    },
  },
  agent: {
    type: 'modulePath',
    value: process.env.AGENT_MODULE || '@tarko/agent-markdown',
  },
};
```
