# @tarko/mcp-agent

## 简介

`@tarko/mcp-agent` 是基于 Model Context Protocol (MCP) 的代理框架，用于连接 MCP 服务器并集成其工具。

## 什么时候使用？

连接 MCP 服务器时使用。

## 安装

```bash
npm install @tarko/mcp-agent
```

## 核心特性

- 多服务器连接
- 自动工具发现和注册
- v1/v2 客户端支持
- 服务器过滤 (include/exclude)
- 连接生命周期管理

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

```ts
// 只启用指定服务器
const agent = new MCPAgent({
  mcpServers: { filesystem: {/*...*/}, github: {/*...*/} },
  mcpServer: { include: ['filesystem'] },
});

// 排除指定服务器
const agent = new MCPAgent({
  mcpServers: { filesystem: {/*...*/}, github: {/*...*/} },
  mcpServer: { exclude: ['github'] },
});
```

### 客户端版本

```ts
const agent = new MCPAgent({
  mcpServers: { /*...*/ },
  mcpClientVersion: 'v1', // 默认 'v2'
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



## 相关链接

- [Model Context Protocol 官方文档](https://modelcontextprotocol.io/)
- [MCP 服务器列表](https://github.com/modelcontextprotocol/servers)
- [@tarko/agent 核心文档](../agent/core.mdx)
