# @tarko/mcp-agent

## 简介

`@tarko/mcp-agent` 是一个基于 **Model Context Protocol (MCP)** 的智能代理框架，允许你轻松连接和管理多个 MCP 服务器，并将其工具集成到你的 AI 代理中。

## 什么时候使用？

当你需要构建一个能够与多个外部服务和工具交互的 AI 代理时，`@tarko/mcp-agent` 是理想的选择：

- **多服务集成**：连接文件系统、数据库、API 服务等多个 MCP 服务器
- **工具统一管理**：将来自不同服务器的工具统一管理和调用
- **动态服务发现**：运行时发现和注册新的 MCP 服务器和工具
- **企业级应用**：构建需要访问多种企业系统的智能助手

## 安装

```bash
npm install @tarko/mcp-agent
```

## 核心特性

- [x] **多服务器支持**：同时连接和管理多个 MCP 服务器
- [x] **自动工具发现**：自动发现并注册 MCP 服务器提供的工具
- [x] **灵活的客户端版本**：支持 v1 和 v2 MCP 客户端实现
- [x] **服务器过滤**：支持 include/exclude 模式过滤特定服务器
- [x] **错误处理**：完善的错误处理和日志记录
- [x] **资源管理**：自动管理连接生命周期和资源清理

## 快速开始

### 基础用法

创建 `index.ts`：

```ts
import { MCPAgent } from '@tarko/mcp-agent';

const agent = new MCPAgent({
  mcpServers: {
    filesystem: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
    },
    github: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: 'your-token-here',
      },
    },
  },
});

async function main() {
  // 初始化代理，连接所有 MCP 服务器
  await agent.initialize();

  // 运行代理
  const response = await agent.run({
    input: '帮我查看当前目录下的文件，然后创建一个新的 README.md',
  });

  console.log(response);

  // 清理资源
  await agent.cleanup();
}

main();
```

### 服务器过滤

你可以使用 `include` 和 `exclude` 模式来过滤特定的 MCP 服务器：

```ts
const agent = new MCPAgent({
  mcpServers: {
    filesystem: { /* ... */ },
    github: { /* ... */ },
    database: { /* ... */ },
  },
  // 只启用文件系统和 GitHub 服务器
  mcpServer: {
    include: ['filesystem', 'github'],
  },
});
```

或者排除特定服务器：

```ts
const agent = new MCPAgent({
  mcpServers: {
    filesystem: { /* ... */ },
    github: { /* ... */ },
    database: { /* ... */ },
  },
  // 排除数据库服务器
  mcpServer: {
    exclude: ['database'],
  },
});
```

### 客户端版本选择

默认使用 v2 客户端，你也可以选择 v1 客户端：

```ts
const agent = new MCPAgent({
  mcpServers: { /* ... */ },
  mcpClientVersion: 'v1', // 或 'v2'
});
```

## API 参考

### MCPAgent

#### 构造函数

```ts
const agent = new MCPAgent(options: MCPAgentOptions);
```

#### MCPAgentOptions

```ts
interface MCPAgentOptions extends AgentOptions {
  /** MCP 服务器配置 */
  mcpServers?: MCPServerRegistry;
  
  /** MCP 服务器过滤选项 */
  mcpServer?: {
    include?: string[];
    exclude?: string[];
  };
  
  /** MCP 客户端版本 */
  mcpClientVersion?: 'v1' | 'v2';
}
```

#### MCPServerConfig

```ts
interface MCPServerConfig {
  /** 启动命令 */
  command?: string;
  
  /** 命令参数 */
  args?: string[];
  
  /** 环境变量 */
  env?: Record<string, string>;
  
  /** SSE 连接 URL（可选，与 command 二选一） */
  url?: string;
}
```

#### 方法

##### initialize()

初始化代理并连接所有 MCP 服务器：

```ts
await agent.initialize();
```

##### cleanup()

清理所有资源和连接：

```ts
await agent.cleanup();
```

## 配置示例

### 文件系统服务器

```ts
const agent = new MCPAgent({
  mcpServers: {
    filesystem: {
      command: 'npx',
      args: [
        '@modelcontextprotocol/server-filesystem',
        '/Users/username/projects',
        '/Users/username/documents',
      ],
    },
  },
});
```

### GitHub 服务器

```ts
const agent = new MCPAgent({
  mcpServers: {
    github: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
      },
    },
  },
});
```

### PostgreSQL 服务器

```ts
const agent = new MCPAgent({
  mcpServers: {
    postgres: {
      command: 'npx',
      args: ['@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/db',
      },
    },
  },
});
```

### SSE 连接

```ts
const agent = new MCPAgent({
  mcpServers: {
    remote_service: {
      url: 'https://api.example.com/mcp',
    },
  },
});
```

## 高级用法

### 动态服务器管理

```ts
import { MCPAgent } from '@tarko/mcp-agent';

class DynamicMCPAgent extends MCPAgent {
  async addServer(name: string, config: MCPServerConfig) {
    // 动态添加新的 MCP 服务器
    // 注意：这需要重新初始化代理
    this.mcpServerConfig[name] = config;
    await this.initialize();
  }
}
```

### 自定义工具适配器

```ts
import { MCPToolAdapter } from '@tarko/mcp-agent';

class CustomToolAdapter extends MCPToolAdapter {
  createTools() {
    const tools = super.createTools();
    
    // 自定义工具处理逻辑
    return tools.map(tool => ({
      ...tool,
      description: `[自定义] ${tool.description}`,
    }));
  }
}
```

## 故障排除

### 常见问题

**Q: 连接 MCP 服务器失败**

A: 检查以下几点：
- 确保 MCP 服务器包已正确安装
- 验证命令路径和参数是否正确
- 检查环境变量是否设置正确
- 查看日志输出中的详细错误信息

**Q: 工具调用失败**

A: 可能的原因：
- 工具参数格式不正确
- MCP 服务器内部错误
- 权限不足（如文件系统访问）

**Q: 性能问题**

A: 优化建议：
- 使用服务器过滤减少不必要的连接
- 选择合适的客户端版本（v2 通常性能更好）
- 合理配置超时时间

### 调试模式

启用详细日志以获得更多调试信息：

```ts
const agent = new MCPAgent({
  logger: {
    level: 'debug',
  },
  mcpServers: { /* ... */ },
});
```

## 最佳实践

1. **资源管理**：始终在应用结束时调用 `cleanup()` 方法
2. **错误处理**：使用 try-catch 包装 MCP 操作
3. **服务器过滤**：只启用需要的服务器以提高性能
4. **环境变量**：将敏感信息（如 API 密钥）存储在环境变量中
5. **版本选择**：优先使用 v2 客户端以获得更好的性能和稳定性

## 相关链接

- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [MCP 服务器列表](https://github.com/modelcontextprotocol/servers)
- [@tarko/agent 核心文档](../agent/core.mdx)
