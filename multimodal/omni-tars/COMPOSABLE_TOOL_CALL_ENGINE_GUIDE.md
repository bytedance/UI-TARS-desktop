# Composable Tool Call Engine 架构指南

## 概述

Composable Tool Call Engine 架构允许每个 agent 实现自定义的 tool call engine，并通过 `@omni-tars/core` 进行组合使用。这个架构提供了灵活性、可扩展性和智能的引擎选择机制。

## 核心概念

### 1. ToolCallEngineProvider 抽象类

```typescript
abstract class ToolCallEngineProvider<T extends ToolCallEngine = ToolCallEngine> {
  abstract readonly name: string;                    // 引擎唯一标识
  abstract readonly priority: number;                // 优先级（数字越大优先级越高）
  abstract readonly description?: string;            // 引擎描述
  getEngine(): T;                                   // 获取引擎实例（单例模式）
  protected abstract createEngine(): T;             // 创建引擎实例（子类实现）
  abstract canHandle?(context: ToolCallEngineContext): boolean; // 判断是否能处理特定上下文
}
```

### 2. ComposableToolCallEngine

组合多个 tool call engine 的核心类，支持：
- **优先级选择**：根据优先级自动选择合适的引擎
- **条件匹配**：基于工具类型和上下文智能选择
- **回退策略**：当首选引擎不可用时的备选方案
- **运行时切换**：根据任务类型动态切换引擎

### 3. 选择策略

- `priority`: 使用最高优先级且能处理当前上下文的引擎
- `first_match`: 使用第一个能处理当前上下文的引擎
- `fallback`: 按优先级尝试，失败时回退到下一个

## 架构优势

### 1. 灵活性
- 每个 agent 可以提供专门优化的 tool call engine
- 支持运行时动态选择和切换
- 可以根据任务类型自动适配

### 2. 可扩展性
- 新的 agent 可以轻松添加自己的 tool call engine
- 插件化设计，易于维护和升级
- 支持第三方扩展

### 3. 健壮性
- 多层回退机制确保系统稳定性
- 详细的日志和调试信息
- 向后兼容现有代码

## 现有实现

### 1. McpToolCallEngineProvider
- **优先级**: 100
- **适用场景**: MCP 相关任务，自定义提示解析
- **特性**: 支持 `<think>`, `<answer>`, `<|FunctionCallBegin|>` 等标签解析，单例模式优化

### 2. GuiToolCallEngineProvider  
- **优先级**: 90
- **适用场景**: GUI 自动化，计算机使用任务
- **特性**: 优化的截图和界面交互处理，单例模式优化

### 3. CodeToolCallEngineProvider
- **优先级**: 80
- **适用场景**: 代码执行，文件编辑，开发任务
- **特性**: 原生 OpenAI tool call 支持，低温度设置，单例模式优化

## 接入指南

### 1. 创建基础的组合 Agent

```typescript
import {
  ComposableAgent,
  ToolCallEngineCompositionConfig,
} from '@omni-tars/core';
import { 
  McpAgentPlugin, 
  McpToolCallEngineProvider 
} from '@omni-tars/mcp-agent';
import { 
  CodeAgentPlugin, 
  CodeToolCallEngineProvider 
} from '@omni-tars/code-agent';

// 配置 tool call engines
const toolCallEngineConfig: ToolCallEngineCompositionConfig = {
  engines: [
    new McpToolCallEngineProvider(),
    new CodeToolCallEngineProvider(),
  ],
  strategy: 'priority',
};

// 创建组合 agent
const agent = new ComposableAgent({
  composition: {
    name: 'My Composable Agent',
    plugins: [
      new McpAgentPlugin({ mcpServers: [...] }),
      new CodeAgentPlugin({ workingDirectory: './src' }),
    ],
    toolCallEngineConfig,
  },
});

await agent.initialize();
```

### 2. 实现自定义 ToolCallEngineProvider

```typescript
import { ToolCallEngine } from '@tarko/agent';
import { ToolCallEngineProvider, ToolCallEngineContext } from '@omni-tars/core';

// 1. 实现自定义的 ToolCallEngine
class MyCustomToolCallEngine extends ToolCallEngine {
  preparePrompt(instructions: string, tools: Tool[]): string {
    // 自定义提示处理逻辑
    return `${instructions}\n\nCustom instructions for my engine...`;
  }

  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    // 自定义请求准备逻辑
    return {
      model: context.model,
      messages: context.messages,
      temperature: 0.5, // 自定义温度
      // ... 其他配置
    };
  }

  // 实现其他必需方法...
}

// 2. 实现 ToolCallEngineProvider（抽象类）
export class MyCustomToolCallEngineProvider extends ToolCallEngineProvider<MyCustomToolCallEngine> {
  readonly name = 'my-custom-engine';
  readonly priority = 70;
  readonly description = 'My custom tool call engine for specific tasks';

  protected createEngine(): MyCustomToolCallEngine {
    return new MyCustomToolCallEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    // 判断是否应该使用这个引擎
    return context.tools.some(tool => 
      tool.function.name.includes('my_special_tool')
    );
  }
}
```

### 3. 注册自定义引擎

```typescript
const toolCallEngineConfig: ToolCallEngineCompositionConfig = {
  engines: [
    new MyCustomToolCallEngineProvider(),     // 自定义引擎
    new GuiToolCallEngineProvider(),          // GUI 引擎  
    new McpToolCallEngineProvider(),          // MCP 引擎
    new CodeToolCallEngineProvider(),         // 代码引擎
  ],
  strategy: 'priority',
  defaultEngine: new CodeToolCallEngineProvider(), // 默认回退引擎
};
```

### 4. 高级配置选项

```typescript
// 专门针对开发任务的配置
const devEngineConfig: ToolCallEngineCompositionConfig = {
  engines: [
    new CodeToolCallEngineProvider(),
    new McpToolCallEngineProvider(),
  ],
  strategy: 'first_match',
};

// 通用任务的配置
const generalEngineConfig: ToolCallEngineCompositionConfig = {
  engines: [
    new GuiToolCallEngineProvider(),
    new McpToolCallEngineProvider(),
    new CodeToolCallEngineProvider(),
  ],
  strategy: 'fallback',
  defaultEngine: new CodeToolCallEngineProvider(),
};
```

## 最佳实践

### 1. 优先级设置
- GUI 任务: 90-100
- 搜索/网络任务: 80-90  
- 代码任务: 70-80
- 通用任务: 60-70
- 默认/回退: 50-60

### 2. canHandle 实现
```typescript
canHandle(context: ToolCallEngineContext): boolean {
  // 检查工具名称
  const hasRelevantTools = context.tools.some(tool =>
    this.relevantToolNames.some(name =>
      tool.function.name.toLowerCase().includes(name.toLowerCase())
    )
  );

  // 检查模型兼容性
  const isCompatibleModel = this.supportedModels.some(model =>
    context.model.toLowerCase().includes(model.toLowerCase())
  );

  // 检查其他上下文条件
  return hasRelevantTools && isCompatibleModel;
}
```

### 3. 错误处理
```typescript
// 在 ComposableToolCallEngine 中会自动处理引擎选择失败的情况
// 建议在自定义引擎中也添加适当的错误处理

class MyToolCallEngine extends ToolCallEngine {
  processStreamingChunk(chunk: ChatCompletionChunk, state: StreamProcessingState): StreamChunkResult {
    try {
      // 处理逻辑
      return { /* ... */ };
    } catch (error) {
      this.logger.error('Error processing chunk:', error);
      // 返回安全的默认值
      return {
        content: '',
        reasoningContent: '',
        hasToolCallUpdate: false,
        toolCalls: [],
      };
    }
  }
}
```

### 4. 日志和调试
```typescript
// ComposableToolCallEngine 提供内置的调试方法
const engine = new ComposableToolCallEngine(config);

// 查看可用引擎信息
console.log(engine.getEngineInfo());

// 查看当前活跃引擎
console.log(engine.getActiveEngineName());
```

## 测试策略

### 1. 单元测试
```typescript
describe('MyCustomToolCallEnginePlugin', () => {
  it('should handle relevant tools', () => {
    const plugin = new MyCustomToolCallEnginePlugin();
    const context = {
      tools: [{ function: { name: 'my_special_tool' } }],
      messages: [],
      model: 'gpt-4',
    };
    
    expect(plugin.canHandle(context)).toBe(true);
  });

  it('should create engine instance', () => {
    const plugin = new MyCustomToolCallEnginePlugin();
    const engine = plugin.createEngine();
    
    expect(engine).toBeInstanceOf(MyCustomToolCallEngine);
  });
});
```

### 2. 集成测试
```typescript
describe('ComposableAgent with custom engines', () => {
  it('should select appropriate engine for task', async () => {
    const agent = await createTestAgent();
    
    // 测试不同类型的任务是否选择了正确的引擎
    const response = await agent.query('Execute Python code');
    
    // 验证使用了正确的引擎
    expect(response.metadata.engineUsed).toBe('code-tool-call-engine');
  });
});
```

## 性能优化

### 1. 内置单例模式
```typescript
// ToolCallEngineProvider 已经内置了单例模式
class MyOptimizedProvider extends ToolCallEngineProvider<MyCustomEngine> {
  readonly name = 'optimized-engine';
  readonly priority = 80;

  protected createEngine(): MyCustomEngine {
    // 这个方法只会被调用一次，之后会复用实例
    return new MyCustomEngine();
  }
}
```

### 2. 延迟初始化
```typescript
class LazyToolCallEngineProvider extends ToolCallEngineProvider {
  private engineFactory: () => ToolCallEngine;

  constructor(factory: () => ToolCallEngine) {
    super();
    this.engineFactory = factory;
  }

  protected createEngine(): ToolCallEngine {
    return this.engineFactory();
  }
}
```

### 3. 性能监控
```typescript
class PerformanceAwareProvider extends ToolCallEngineProvider {
  protected createEngine(): ToolCallEngine {
    const start = performance.now();
    const engine = new MyEngine();
    const duration = performance.now() - start;
    console.log(`Engine creation took ${duration}ms`);
    return engine;
  }
}
```

## 故障排除

### 1. 常见问题

**问题**: 引擎选择不符合预期
**解决**: 检查 `canHandle` 方法的实现和优先级设置

**问题**: 工具调用失败
**解决**: 确认引擎的 `prepareRequest` 方法正确配置了工具定义

**问题**: 性能问题
**解决**: 考虑使用引擎缓存和优化 `canHandle` 方法

### 2. 调试技巧

```typescript
// 启用详细日志
const agent = new ComposableAgent({
  composition: {
    // ... 配置
  },
  logLevel: 'debug',
});

// 监听引擎选择事件
agent.on('engineSelected', (engineName) => {
  console.log(`Selected engine: ${engineName}`);
});
```

## 后续规划

1. **动态引擎注册**: 支持运行时添加/移除引擎
2. **性能监控**: 添加引擎性能指标收集
3. **A/B 测试**: 支持不同引擎的效果对比
4. **智能学习**: 基于历史表现自动调整引擎选择策略

## 新特性亮点

### 🔄 单例模式优化
- **自动缓存**: `ToolCallEngineProvider` 内置单例模式，自动缓存引擎实例
- **性能提升**: 避免重复创建引擎，提升系统性能
- **内存优化**: 减少内存占用，特别适合长期运行的服务

### 🎯 强类型支持
- **泛型约束**: 支持泛型类型，提供更好的类型安全
- **编译时检查**: TypeScript 编译时就能发现类型错误
- **更好的 IDE 支持**: 完整的代码提示和自动补全

### 🏗️ 抽象类设计
- **标准化实现**: 通过抽象类确保实现的一致性
- **受保护的创建方法**: `createEngine` 方法为 protected，确保正确使用
- **扩展友好**: 子类只需实现核心逻辑，框架处理缓存等通用功能

## 总结

Composable Tool Call Engine 架构为 omni-tars 项目提供了强大的扩展性和灵活性。**最新版本引入了 `ToolCallEngineProvider` 抽象类，提供了内置的单例模式优化和强类型支持**。

通过这个架构：

- 各个 agent 可以专注于自己的核心功能
- Tool call engine 可以针对特定场景进行优化，同时享受单例模式的性能优势
- 系统整体保持了高度的可维护性和可扩展性
- 用户可以根据需求灵活配置和组合不同的引擎
- **性能得到显著提升，特别是在高频使用场景下**

这个设计充分体现了组合优于继承的设计原则，同时通过抽象类提供了标准化的实现框架，为构建复杂的多模态 AI 系统提供了坚实的基础。