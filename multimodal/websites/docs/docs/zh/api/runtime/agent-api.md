# Agent API

**Agent** 类是 MCP Agent 框架的核心组件，提供事件驱动架构来构建具有工具执行能力的多模态 AI 智能体。

## 构造函数

### `new Agent(options?)`

使用指定配置创建新的 Agent 实例。

```typescript
import { Agent } from '@tarko/agent';

const agent = new Agent({
  instructions: '你是一个有用的助手',
  tools: [myTool],
  model: {
    provider: 'openai',
    id: 'gpt-4'
  },
  maxIterations: 10
});
```

**参数：**
- `options` (`AgentOptions`): Agent 的配置选项

## 核心方法

### `run(input)` / `run(options)`

使用提供的输入执行智能体的推理循环。

```typescript
// 简单文本输入
const response = await agent.run('天气怎么样？');

// 带选项（非流式）
const response = await agent.run({
  input: '分析这张图片',
  model: 'gpt-4-vision-preview'
});

// 流式模式
const stream = await agent.run({
  input: '帮我规划一次旅行',
  stream: true
});

for await (const event of stream) {
  console.log(event);
}
```

**重载：**
- `run(input: string): Promise<AssistantMessageEvent>`
- `run(options: AgentRunNonStreamingOptions): Promise<AssistantMessageEvent>`
- `run(options: AgentRunStreamingOptions): Promise<AsyncIterable<Event>>`

**参数：**
- `input` (`string`): 简单文本输入
- `options` (`AgentRunOptions`): 此次执行的配置

### `registerTool(tool)`

注册智能体在执行过程中可以使用的工具。

```typescript
import { Tool } from '@tarko/agent';

const weatherTool: Tool = {
  name: 'get_weather',
  description: '获取指定位置的当前天气',
  schema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: '城市名称' }
    },
    required: ['location']
  },
  function: async (args) => {
    const { location } = args as { location: string };
    return `${location}的天气：晴朗，25°C`;
  }
};

agent.registerTool(weatherTool);
```

**参数：**
- `tool` (`Tool`): 要注册的工具定义

### `getTools()`

返回所有已注册的工具，经过工具过滤选项筛选。

```typescript
const tools = agent.getTools();
console.log(`智能体有 ${tools.length} 个可用工具`);
```

**返回：** `Tool[]` - 可用工具定义数组

### `abort()`

中止当前正在运行的智能体任务。

```typescript
const isAborted = agent.abort();
if (isAborted) {
  console.log('智能体执行已中止');
}
```

**返回：** `boolean` - 如果执行被中止则返回 true，否则返回 false

### `status()`

返回智能体的当前执行状态。

```typescript
const currentStatus = agent.status();
console.log(`智能体状态：${currentStatus}`);
```

**返回：** `AgentStatus` - 当前执行状态

## LLM 集成

### `setCustomLLMClient(client)`

设置自定义 LLM 客户端用于测试或自定义实现。

```typescript
import OpenAI from 'openai';

const customClient = new OpenAI({
  apiKey: 'your-api-key',
  baseURL: 'https://custom-llm-endpoint.com'
});

agent.setCustomLLMClient(customClient);
```

**参数：**
- `client` (`OpenAI`): OpenAI 兼容的 LLM 客户端

### `getLLMClient()`

获取配置的 LLM 客户端用于直接请求。

```typescript
const llmClient = agent.getLLMClient();
if (llmClient) {
  const response = await llmClient.chat.completions.create({
    messages: [{ role: 'user', content: '你好' }]
  });
}
```

**返回：** `OpenAI | undefined` - LLM 客户端实例

### `callLLM(params, options?)`

直接调用当前选定 LLM 的便捷方法。

```typescript
// 非流式调用
const response = await agent.callLLM({
  messages: [{ role: 'user', content: '你好' }],
  temperature: 0.7
});

// 流式调用
const stream = await agent.callLLM({
  messages: [{ role: 'user', content: '你好' }],
  stream: true
});

for await (const chunk of stream) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

**参数：**
- `params` (`Omit<ChatCompletionCreateParams, 'model'>`): 聊天完成参数
- `options` (`RequestOptions`): 可选的请求选项

**返回：** `Promise<ChatCompletion | AsyncIterable<ChatCompletionChunk>>`

## 实用方法

### `getCurrentLoopIteration()`

获取智能体推理过程的当前迭代次数。

```typescript
const iteration = agent.getCurrentLoopIteration();
console.log(`当前在第 ${iteration} 次迭代`);
```

**返回：** `number` - 当前循环迭代次数（从1开始，未运行时为0）

### `getCurrentResolvedModel()`

获取当前解析的模型配置。

```typescript
const model = agent.getCurrentResolvedModel();
if (model) {
  console.log(`使用 ${model.provider}/${model.id}`);
}
```

**返回：** `ResolvedModel | undefined` - 当前解析的模型

### `getAvailableTools()`

返回应用过滤器和钩子后的所有可用工具。

```typescript
const availableTools = await agent.getAvailableTools();
console.log(`${availableTools.length} 个工具可用于执行`);
```

**返回：** `Promise<Tool[]>` - 可用工具数组

### `getEventStream()`

返回用于监控智能体执行的事件流管理器。

```typescript
const eventStream = agent.getEventStream();
eventStream.on('assistant_message', (event) => {
  console.log('助手：', event.content);
});
```

**返回：** `AgentEventStreamProcessor` - 事件流实例

## 摘要生成

### `generateSummary(request)`

生成对话消息的摘要。

```typescript
const summary = await agent.generateSummary({
  messages: [
    { role: 'user', content: '什么是机器学习？' },
    { role: 'assistant', content: '机器学习是...' }
  ]
});

console.log(`摘要：${summary.summary}`);
```

**参数：**
- `request` (`SummaryRequest`): 包含消息和选项的摘要请求

**返回：** `Promise<SummaryResponse>` - 生成的摘要

## 资源管理

### `dispose()`

释放智能体并清理所有资源。

```typescript
// 完成后清理
await agent.dispose();
console.log('智能体已成功释放');
```

**返回：** `Promise<void>`

## 配置选项

### `AgentOptions`

智能体初始化的配置选项：

```typescript
interface AgentOptions {
  // 核心配置
  instructions?: string;           // 系统提示/指令
  name?: string;                   // 智能体名称用于标识
  id?: string;                     // 唯一智能体ID
  
  // 模型配置
  model?: ModelConfiguration;      // LLM 模型设置
  temperature?: number;            // 采样温度 (0-1)
  top_p?: number;                 // 核采样参数
  
  // 执行限制
  maxIterations?: number;         // 最大推理迭代次数
  maxTokens?: number;             // 每次请求的最大令牌数
  
  // 工具和能力
  tools?: Tool[];                 // 可用工具
  toolCallEngine?: ToolCallEngineType; // 工具执行引擎
  
  // 上下文管理
  context?: AgentContextAwarenessOptions; // 多模态上下文设置
  
  // 推理和规划
  thinking?: LLMReasoningOptions; // 推理配置
  
  // 日志和监控
  logLevel?: LogLevel;            // 日志详细程度
  metric?: { enable: boolean };   // 启用指标收集
  
  // 事件处理
  eventStreamOptions?: EventStreamOptions; // 事件流配置
  enableStreamingToolCallEvents?: boolean; // 流式工具调用事件
  
  // 工具过滤
  tool?: ToolFilterOptions;       // 工具过滤配置
}
```

### `AgentRunOptions`

智能体执行选项：

```typescript
interface AgentRunObjectOptions {
  input: string | ChatCompletionContentPart[]; // 用户输入
  stream?: boolean;                            // 启用流式
  sessionId?: string;                          // 会话标识符
  model?: string;                              // 覆盖模型
  provider?: string;                           // 覆盖提供商
  toolCallEngine?: ToolCallEngineType;         // 覆盖工具引擎
  environmentInput?: EnvironmentInput;         // 环境上下文
  abortSignal?: AbortSignal;                  // 取消信号
}
```

## 事件和监控

智能体在执行过程中会发出各种事件：

- `user_message` - 接收到用户输入
- `assistant_message` - 生成智能体响应
- `tool_call` - 开始工具执行
- `tool_result` - 完成工具执行
- `system` - 系统事件和错误
- `agent_run_start` - 智能体执行开始
- `agent_run_end` - 智能体执行完成

```typescript
const eventStream = agent.getEventStream();

eventStream.on('tool_call', (event) => {
  console.log(`调用工具：${event.name}`);
});

eventStream.on('assistant_message', (event) => {
  console.log(`助手：${event.content}`);
});
```

## 错误处理

智能体提供健壮的错误处理：

```typescript
try {
  const response = await agent.run('处理这个请求');
  console.log(response.content);
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('请求被取消');
  } else {
    console.error('智能体错误：', error.message);
  }
}
```

常见错误场景：
- **AbortError**: 通过 `abort()` 或 `AbortSignal` 取消请求
- **ModelError**: LLM 提供商或模型配置问题
- **ToolError**: 工具执行失败
- **ValidationError**: 无效输入或配置

## 最佳实践

1. **资源管理**: 使用完智能体后始终调用 `dispose()`
2. **错误处理**: 将智能体调用包装在 try-catch 块中
3. **工具设计**: 保持工具专注且文档良好
4. **上下文限制**: 使用 `maxImagesCount` 管理多模态上下文
5. **流式处理**: 对长时间运行的任务和实时反馈使用流式
6. **监控**: 订阅事件用于调试和分析

## 示例：完整的智能体设置

```typescript
import { Agent, Tool } from '@tarko/agent';

// 定义工具
const calculatorTool: Tool = {
  name: 'calculate',
  description: '执行数学计算',
  schema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: '要计算的数学表达式' }
    },
    required: ['expression']
  },
  function: async (args) => {
    const { expression } = args as { expression: string };
    try {
      const result = eval(expression); // 注意：生产环境中使用安全的数学计算器
      return `结果：${result}`;
    } catch (error) {
      return `错误：无效表达式`;
    }
  }
};

// 创建智能体
const agent = new Agent({
  instructions: '你是一个有用的数学助手。使用计算器工具进行计算。',
  tools: [calculatorTool],
  model: {
    provider: 'openai',
    id: 'gpt-4'
  },
  maxIterations: 5,
  temperature: 0.1,
  logLevel: 1 // 信息级别
});

// 设置事件监控
const eventStream = agent.getEventStream();
eventStream.on('tool_call', (event) => {
  console.log(`🔧 调用 ${event.name}：`, event.args);
});

eventStream.on('assistant_message', (event) => {
  console.log(`🤖 助手：${event.content}`);
});

// 执行智能体
async function main() {
  try {
    const response = await agent.run('15 * 23 + 7 等于多少？');
    console.log('最终答案：', response.content);
  } catch (error) {
    console.error('错误：', error.message);
  } finally {
    await agent.dispose();
  }
}

main();
```
