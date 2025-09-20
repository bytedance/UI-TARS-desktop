# Tarko 文档贡献指南

## 📚 文档-源代码映射

### `@tarko/agent` 核心包
**源码：** `multimodal/tarko/agent/`

| 文档页面 | 源代码文件 | 说明 |
|----------|------------|------|
| `/guide/get-started/sdk.mdx` | `src/agent/agent.ts` | 主 Agent 类 API |
| `/guide/basic/tool-call-engine.mdx` | `src/tool-call-engine/` | 工具调用引擎 |
| `/guide/basic/event-stream.mdx` | `src/agent/event-stream.ts` | 事件流处理器 |
| `/guide/advanced/agent-hooks.mdx` | `src/agent/base-agent.ts` | Agent 钩子实现 |
| `/guide/advanced/context-engineering.mdx` | `src/agent/message-history.ts` | 上下文管理 |
| `/api/agent.mdx` | `src/index.ts` | 主要导出和接口 |

### `@tarko/agent-interface` 接口包
**源码：** `multimodal/tarko/agent-interface/`

| 文档页面 | 源代码文件 | 说明 |
|----------|------------|------|
| `/api/agent.mdx` | `src/agent.ts` | IAgent 接口 |
| `/api/tool-call-engine.mdx` | `src/tool-call-engine.ts` | 工具调用引擎接口 |
| `/guide/basic/event-stream.mdx` | `src/agent-event-stream.ts` | 事件流类型 |

### `@tarko/model-provider` 模型提供商
**源码：** `multimodal/tarko/model-provider/`

| 文档页面 | 源代码文件 | 说明 |
|----------|------------|------|
| `/guide/basic/model-provider.mdx` | `src/` | 模型提供商实现 |

### `@tarko/agent-server` 服务器
**源码：** `multimodal/tarko/agent-server/`

| 文档页面 | 源代码文件 | 说明 |
|----------|------------|------|
| `/guide/deployment/server.mdx` | `src/` | 服务器实现 |
| `/guide/advanced/agent-protocol.mdx` | `src/` | 协议定义 |

### `@tarko/agent-cli` 命令行
**源码：** `multimodal/tarko/agent-cli/`

| 文档页面 | 源代码文件 | 说明 |
|----------|------------|------|
| `/guide/deployment/cli.mdx` | `src/` | CLI 实现 |

### `@tarko/agent-ui` 用户界面
**源码：** `multimodal/tarko/agent-ui/`

| 文档页面 | 源代码文件 | 说明 |
|----------|------------|------|
| `/guide/ui-integration/web.mdx` | `src/` | Web UI 组件 |
| `/guide/ui-integration/native.mdx` | `src/` | 原生集成 |

## ✅ 文档编写规则

1. **代码示例必须真实** - 从 `examples/` 目录复制，禁止编造代码
2. **API 文档匹配接口** - 检查 TypeScript 定义，确保参数名称和类型正确
3. **中英文同步** - 同时更新两个版本
4. **链接到源码** - 提供 GitHub 链接
5. **Tool Call Engine 类型** - 必须使用源码中的实际类型：`native`、`prompt_engineering`、`structured_outputs`
6. **Tool 定义** - 使用 `Tool` 类构造函数，参数为 `{ id, description, parameters, function }`
7. **Agent 配置** - 使用实际的 `AgentOptions` 接口属性名

---

**记住：** 文档必须反映真实代码，不能编造！提交信息语言根据内容类型选择！
