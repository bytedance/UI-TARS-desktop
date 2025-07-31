# Agent CLI

Agent CLI 是一个基于 Agent Kernel 的 CLI 框架，提供了完整的命令行接口和 Web UI 支持。它既可以直接使用，也可以作为基础框架进行二次开发。

## 安装

```bash
npm install @tarko/cli
```

## 直接使用

Agent CLI 提供了 `tarko` 命令行工具，可以直接运行基于 Agent Kernel 开发的 Agent。

### 基本命令

```bash
# 启动交互式 Web UI（默认命令）
tarko

# 启动 Web UI 并指定端口
tarko --port 3000

# 启动无头模式 API 服务器
tarko serve

# 运行单次查询（静默模式）
tarko run --input "帮我分析这个文件"

# 发送直接请求到 LLM 提供商
tarko request --provider openai --model gpt-4 --body '{"messages":[{"role":"user","content":"Hello"}]}'
```

### 配置文件

支持多种配置文件格式，按优先级自动查找：

```bash
# TypeScript 配置
agent.config.ts

# YAML 配置
agent.config.yaml

# JSON 配置
agent.config.json
```

配置示例（`agent.config.ts`）：

```typescript
import { defineConfig } from '@tarko/agent-cli';

export default defineConfig({
  model: {
    provider: 'openai',
    id: 'gpt-4',
    apiKey: 'OPENAI_API_KEY'
  },
  workspace: {
    workingDirectory: './workspace'
  },
  server: {
    port: 8888
  }
});
```

### 命令行选项

#### 模型配置
```bash
--model.provider <provider>    # LLM 提供商
--model.id <model>            # 模型 ID
--model.apiKey <key>          # API 密钥
--model.baseURL <url>         # 基础 URL
```

#### 工作空间配置
```bash
--workspace.workingDirectory <path>  # 工作目录
```

#### 服务器配置
```bash
--port <port>                 # 服务器端口（默认 8888）
--open                        # 启动时打开浏览器
```

#### 调试选项
```bash
--debug                       # 启用调试模式
--quiet                       # 减少日志输出
--logLevel <level>           # 日志级别（debug|info|warn|error）
```

#### 配置文件
```bash
--config <path>              # 指定配置文件路径
--config <url>               # 远程配置文件 URL
```

## 自定义开发

### 基础扩展

创建自定义 CLI：

```typescript
import { AgentCLI } from '@tarko/agent-cli';

class MyCLI extends AgentCLI {
  // 重写静态文件路径
  protected getStaticPath(): string {
    return path.resolve(__dirname, '../static');
  }

  // 自定义 logo
  protected printLogo(): void {
    console.log('🚀 My Custom Agent CLI');
  }
}

// 启动 CLI
const cli = new MyCLI();
cli.bootstrap({
  version: '1.0.0',
  buildTime: Date.now(),
  gitHash: 'abc123',
  binName: 'my-agent'
});
```

### 添加自定义命令

```typescript
import { AgentCLI, CommandHandler } from '@tarko/agent-cli';
import { Command } from 'cac';

class MyCommandHandler implements CommandHandler {
  async execute(options: any): Promise<void> {
    console.log('执行自定义命令', options);
  }
}

class MyCLI extends AgentCLI {
  bootstrap() {
    super.bootstrap({
      version: '1.0.0',
      buildTime: Date.now(),
      gitHash: 'abc123',
      binName: 'my-agent',
      customCommands: [{
        name: 'analyze',
        description: '分析代码',
        handler: new MyCommandHandler(),
        optionsConfigurator: (cmd: Command) => {
          return cmd.option('--file <file>', '要分析的文件');
        }
      }]
    });
  }
}
```

### 扩展命令行选项

```typescript
class MyCLI extends AgentCLI {
  // 为所有命令添加通用选项
  private addCommonOptions = (command: Command): Command => {
    return command
      .option('--my-option <value>', '自定义选项')
      .option('--another-option', '另一个选项');
  };

  bootstrap() {
    super.bootstrap({
      version: '1.0.0',
      buildTime: Date.now(),
      gitHash: 'abc123',
      binName: 'my-agent'
    }, {
      commonOptionsConfigurator: this.addCommonOptions,
      // 只为 start 命令添加选项
      startOptionsConfigurator: (cmd) => cmd.option('--start-only', '只在 start 命令可用')
    });
  }
}
```

### 自定义 Agent 解析器

```typescript
class MyCLI extends AgentCLI {
  bootstrap() {
    super.bootstrap({
      version: '1.0.0',
      buildTime: Date.now(),
      gitHash: 'abc123',
      binName: 'my-agent',
      agentResolver: async (agentParam) => {
        if (agentParam === 'my-agent') {
          const { MyAgent } = await import('./MyAgent');
          return {
            agentConstructor: MyAgent,
            agentName: 'My Custom Agent'
          };
        }
        
        // 回退到默认解析器
        return defaultAgentResolver(agentParam);
      }
    });
  }
}
```

### 自定义配置路径构建

```typescript
class MyCLI extends AgentCLI {
  protected buildConfigPaths(options: any, isDebug: boolean): string[] {
    // 添加自定义配置路径
    const paths = super.buildConfigPaths(options, isDebug);
    
    // 添加全局配置
    paths.unshift('~/.my-agent/config.json');
    
    return paths;
  }
}
```

### 完整示例

```typescript
import { AgentCLI, CommandHandler } from '@tarko/agent-cli';
import { Command } from 'cac';
import path from 'path';

class DeployHandler implements CommandHandler {
  async execute(options: { target?: string }): Promise<void> {
    console.log(`部署到 ${options.target || 'default'}`);
  }
}

class MyCLI extends AgentCLI {
  protected getStaticPath(): string {
    return path.resolve(__dirname, '../web-ui');
  }

  protected printLogo(): void {
    console.log(`
    ███╗   ███╗██╗   ██╗     █████╗  ██████╗ ███████╗███╗   ██╗████████╗
    ████╗ ████║╚██╗ ██╔╝    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
    ██╔████╔██║ ╚████╔╝     ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
    ██║╚██╔╝██║  ╚██╔╝      ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
    ██║ ╚═╝ ██║   ██║       ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   
    ╚═╝     ╚═╝   ╚═╝       ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   
    `);
  }

  private addMyOptions = (command: Command): Command => {
    return command
      .option('--env <env>', '部署环境', { default: 'dev' })
      .option('--version <version>', '版本号')
      .option('--dry-run', '试运行模式');
  };

  bootstrap() {
    super.bootstrap({
      version: '2.0.0',
      buildTime: Date.now(),
      gitHash: 'def456',
      binName: 'my-agent',
      customCommands: [{
        name: 'deploy',
        description: '部署应用',
        handler: new DeployHandler(),
        optionsConfigurator: (cmd) => cmd.option('--target <target>', '部署目标')
      }],
      agentResolver: async (agentParam) => {
        if (agentParam === 'my-special-agent') {
          const { MySpecialAgent } = await import('./agents/MySpecialAgent');
          return {
            agentConstructor: MySpecialAgent,
            agentName: 'My Special Agent'
          };
        }
        
        // 使用默认解析器
        const { defaultAgentResolver } = await import('@tarko/agent-cli');
        return defaultAgentResolver(agentParam);
      }
    }, {
      commonOptionsConfigurator: this.addMyOptions
    });
  }
}

// 启动 CLI
const cli = new MyCLI();
cli.bootstrap();
```

## API 参考

### AgentCLI

#### 构造选项 (AgentBootstrapCLIOptions)

- `version: string` - 版本号
- `buildTime: number` - 构建时间戳  
- `gitHash: string` - Git 提交哈希
- `binName?: string` - 命令行工具名称
- `agentResolver?: AgentConstructorResolver` - Agent 构造器解析函数
- `customCommands?: CustomCommand[]` - 自定义命令
- `remoteConfig?: string` - 远程配置 URL

#### 扩展选项 (CLIExtensionOptions)

- `commonOptionsConfigurator?: OptionsConfigurator` - 通用选项配置器
- `startOptionsConfigurator?: OptionsConfigurator` - start 命令选项配置器
- `serveOptionsConfigurator?: OptionsConfigurator` - serve 命令选项配置器
- `runOptionsConfigurator?: OptionsConfigurator` - run 命令选项配置器

### CommandHandler

```typescript
interface CommandHandler {
  execute(options: Record<string, any>): Promise<void>;
}
```

### CustomCommand

```typescript
interface CustomCommand {
  name: string;
  description: string;
  handler: CommandHandler;
  optionsConfigurator?: (command: Command) => Command;
}
```

## 配置系统

配置合并优先级（从低到高）：

1. 远程配置
2. 用户配置文件
3. 工作空间配置文件
4. 命令行参数

### 环境变量支持

命令行参数支持环境变量引用：

```bash
# 使用环境变量
tarko --model.apiKey OPENAI_API_KEY

# 直接使用值
tarko --model.apiKey sk-xxx
```

## 最佳实践

1. **命名约定**：使用清晰的 binName，避免与系统命令冲突
2. **配置管理**：优先使用配置文件，命令行参数用于覆盖
3. **错误处理**：自定义命令要有完善的错误处理
4. **日志记录**：合理使用日志级别，方便调试
5. **静态资源**：Web UI 静态文件要正确打包和路径配置

## 故障排查

### 常见问题

1. **端口被占用**：使用 `--port` 指定其他端口
2. **配置文件未找到**：检查文件路径和格式
3. **Agent 加载失败**：检查 Agent 模块导出
4. **Web UI 无法访问**：确认静态文件路径正确

### 调试技巧

```bash
# 启用详细日志
tarko --debug

# 检查配置合并结果
tarko --debug --config ./debug.config.js

# 静默模式查看纯输出
tarko run --input "test" --quiet
```
