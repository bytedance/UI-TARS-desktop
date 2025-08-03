# Agent CLI

基于 Agent Kernel 构建的通用 Agent 命令行工具框架。支持快速部署和运行 Agent，内置 Web UI，提供强大的扩展能力。

## 快速开始

### 安装

```bash
npm install @tarko/agent-cli
```

### 基础使用

最简单的方式是直接使用内置的 Tarko Agent：

```bash
# 启动交互式 Web UI（默认命令）
tarko

# 启动无头 API 服务器
tarko serve

# 静默模式运行（输出到 stdout）
tarko run "帮我分析当前目录的文件结构"

# 管道输入
echo "总结这段代码" | tarko run
```

### 配置文件

支持多种配置格式，会自动查找 `tarko.config.{ts,yaml,json}`：

```typescript
// tarko.config.ts
import { AgentAppConfig } from '@tarko/agent-server-interface';

const config: AgentAppConfig = {
  model: {
    provider: 'openai',
    id: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
  },
  workspace: {
    workingDirectory: './workspace',
  },
  server: {
    port: 8888,
  },
};

export default config;
```

### 命令行选项

```bash
# 模型配置
tarko --model.provider openai --model.id gpt-4 --model.apiKey sk-xxx

# 服务器配置  
tarko serve --port 3000

# 工作空间
tarko --workspace.workingDirectory ./my-workspace

# 调试模式
tarko --debug

# 使用自定义 Agent
tarko --agent ./my-agent.js
```

## 核心命令

### `tarko` / `tarko start`
启动交互式 Web UI，支持实时对话和文件浏览。

```bash
tarko start --port 8888 --open
```

### `tarko serve`
启动无头 API 服务器，适合集成到其他系统。

```bash
tarko serve --port 8888
# API 端点：http://localhost:8888/api/v1/
```

### `tarko run`
静默模式运行，结果输出到 stdout，适合脚本集成。

```bash
# 文本输出（默认）
tarko run "分析当前目录" --format text

# JSON 输出
tarko run "分析当前目录" --format json

# 包含日志输出
tarko run "分析当前目录" --include-logs
```

### `tarko request`
直接向 LLM 发送请求，用于调试和测试。

```bash
tarko request --provider openai --model gpt-4 --body '{"messages":[{"role":"user","content":"Hello"}]}'
```

### `tarko workspace`
工作空间管理。

```bash
# 初始化全局工作空间
tarko workspace --init

# 打开工作空间（VSCode）
tarko workspace --open

# 查看工作空间状态
tarko workspace --status
```

## 自定义开发

### 创建自定义 CLI

```typescript
// my-cli.ts
import { TarkoAgentCLI, AgentCLIInstantiationOptions } from '@tarko/agent-cli';
import { MyAgent } from './my-agent';

class MyCLI extends TarkoAgentCLI {
  constructor() {
    super({
      version: '1.0.0',
      buildTime: Date.now(),
      gitHash: 'abc123',
      binName: 'my-agent',
      defaultAgent: {
        agentConstructor: MyAgent,
        agentName: 'My Agent',
      },
    });
  }

  // 添加自定义 CLI 选项
  protected configureAgentCommand(command: CLICommand): CLICommand {
    return command
      .option('--custom-option <value>', '自定义选项')
      .option('--feature.enable', '启用特定功能');
  }

  // 自定义 Logo
  protected printLogo(): void {
    printWelcomeLogo(
      'My Agent',
      '1.0.0',
      '我的自定义 Agent',
      ['自定义 ASCII 艺术字'],
      'https://my-agent.com'
    );
  }

  // 添加自定义命令
  protected extendCli(cli: CLIInstance): void {
    cli.command('analyze', '分析命令')
      .option('--deep', '深度分析')
      .action(async (options) => {
        // 自定义命令逻辑
      });
  }

  // 自定义服务器选项
  protected getServerExtraOptions(): AgentServerExtraOptions {
    return {
      ...super.getServerExtraOptions(),
      customFeature: true,
    };
  }
}

// 启动 CLI
new MyCLI().bootstrap();
```

### 配置处理扩展

利用配置构建器处理自定义选项：

```typescript
// 在 CLI 中处理自定义选项
protected async processCommonOptions(options: MyAgentCLIArguments) {
  const { appConfig, agentConstructor, agentName } = await super.processCommonOptions(options);

  // 处理自定义配置
  if (options.customOption) {
    appConfig.customFeature = {
      enabled: true,
      value: options.customOption,
    };
  }

  return { appConfig, agentConstructor, agentName };
}
```

### Agent 实现

创建自定义 Agent 需要实现 `IAgent` 接口：

```typescript
import { IAgent, AgentOptions, AgentEventStream } from '@multimodal/agent-interface';

export class MyAgent implements IAgent {
  constructor(private options: AgentOptions) {}

  async initialize(): Promise<void> {
    // 初始化逻辑
  }

  async run(input: string): Promise<AgentEventStream.AssistantMessageEvent> {
    // Agent 运行逻辑
    return {
      id: 'msg-1',
      type: 'assistant_message',
      timestamp: Date.now(),
      content: '这是我的回复',
    };
  }

  // 实现其他必需方法...
}
```

### 完整示例

参考 Agent TARS CLI 的实现：

```typescript
// agent-tars-cli/src/index.ts
export class AgentTARSCLI extends TarkoAgentCLI {
  constructor(options: AgentCLIInstantiationOptions) {
    super({
      ...DEFAULT_OPTIONS,
      ...(options || {}),
    });
  }

  protected configureAgentCommand(command: CLICommand): CLICommand {
    return command
      // 浏览器配置
      .option('--browser.control [mode]', '浏览器控制模式')
      .option('--browser.cdpEndpoint <endpoint>', 'CDP 端点')
      // 搜索配置
      .option('--search.provider [provider]', '搜索提供商')
      .option('--search.count [count]', '搜索结果数量')
      // 规划器配置
      .option('--planner.enable', '启用规划功能');
  }
}
```

## 配置系统

### 配置文件优先级

1. 命令行参数（最高优先级）
2. 工作空间配置文件
3. 用户指定的配置文件（`--config`）
4. 远程配置 URL
5. 默认配置（最低优先级）

### 环境变量

支持环境变量形式的配置：

```bash
# 使用环境变量
tarko --model.apiKey OPENAI_API_KEY  # 会读取 process.env.OPENAI_API_KEY

# 或直接设置
export OPENAI_API_KEY=sk-xxx
tarko --model.apiKey OPENAI_API_KEY
```

### 配置合并

配置使用深度合并机制，后面的配置会覆盖前面的同名字段：

```typescript
// 基础配置
const baseConfig = {
  model: {
    provider: 'openai',
    temperature: 0.7,
  },
};

// 覆盖配置
const overrideConfig = {
  model: {
    id: 'gpt-4',  // 新增字段
    temperature: 0.5,  // 覆盖字段
  },
};

// 合并结果
const finalConfig = {
  model: {
    provider: 'openai',  // 保留
    id: 'gpt-4',  // 新增
    temperature: 0.5,  // 覆盖
  },
};
```

## 高级功能

### 事件系统

Agent CLI 基于事件驱动架构，支持监听和处理各种事件：

```typescript
// 在 Agent 中监听事件
const eventStream = agent.getEventStream();

eventStream.subscribe((event) => {
  console.log('事件:', event.type, event);
});

// 订阅特定类型事件
eventStream.subscribeToTypes(['tool_call', 'tool_result'], (event) => {
  console.log('工具事件:', event);
});
```

### 控制台拦截

支持拦截和处理控制台输出：

```typescript
import { ConsoleInterceptor } from '@tarko/agent-cli';

const { result, logs } = await ConsoleInterceptor.run(
  async () => {
    // 你的代码
    return await agent.run('输入');
  },
  {
    silent: true,  // 静默模式
    capture: true,  // 捕获日志
  }
);
```

### 工作空间隔离

支持基于会话的工作空间隔离：

```typescript
const config = {
  workspace: {
    workingDirectory: './workspace',
    isolateSessions: true,  // 每个会话使用独立子目录
  },
};
```

## 部署

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 8888
CMD ["tarko", "serve", "--port", "8888"]
```

### 系统服务

```bash
# 使用 PM2 部署
pm2 start tarko --name "my-agent" -- serve --port 8888

# 使用 systemd
sudo systemctl enable my-agent.service
sudo systemctl start my-agent.service
```

## 故障排除

### 常见问题

1. **模型 API 密钥错误**
   ```bash
   # 检查环境变量
   echo $OPENAI_API_KEY
   
   # 使用调试模式
   tarko --debug
   ```

2. **端口被占用**
   ```bash
   # 使用其他端口
   tarko serve --port 3000
   
   # 检查端口占用
   lsof -i :8888
   ```

3. **工作空间权限问题**
   ```bash
   # 检查工作空间权限
   ls -la ./workspace
   
   # 修改权限
   chmod -R 755 ./workspace
   ```

### 调试模式

```bash
# 启用详细日志
tarko --debug --logLevel debug

# 输出配置信息
tarko --debug run "test" --include-logs
```

## API 参考

详细的 API 文档请参考 TypeScript 类型定义：

- `@multimodal/agent-interface` - Agent 核心接口
- `@tarko/agent-server-interface` - 服务器接口  
- `@tarko/agent-cli` - CLI 框架接口

## 贡献指南

欢迎提交 Issue 和 Pull Request！请确保：

1. 遵循现有代码风格
2. 添加必要的测试用例
3. 更新相关文档

## 许可证

Apache-2.0 License
