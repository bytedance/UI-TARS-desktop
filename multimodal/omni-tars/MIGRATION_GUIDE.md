# ToolCallEngineProvider 迁移指南

## 概述

在最新版本中，我们将 `ToolCallEnginePlugin` 重构为 `ToolCallEngineProvider` 抽象类，并引入了单例模式优化。本指南将帮助您升级现有代码。

## 主要变更

### 1. 接口 → 抽象类
- `ToolCallEnginePlugin` (interface) → `ToolCallEngineProvider` (abstract class)
- `createEngine()` → `getEngine()` (公开方法) + `createEngine()` (受保护方法)
- 新增内置单例模式支持

### 2. 方法变更
- ✅ `getEngine()`: 获取引擎实例（单例模式）
- ✅ `protected createEngine()`: 创建引擎实例（子类实现）
- ❌ `createEngine()`: 已移除（改为受保护方法）

## 迁移步骤

### 步骤 1: 更新导入

**旧代码:**
```typescript
import { ToolCallEnginePlugin } from '@omni-tars/core';
import { McpToolCallEnginePlugin } from '@omni-tars/mcp-agent';
```

**新代码:**
```typescript
import { ToolCallEngineProvider } from '@omni-tars/core';
import { McpToolCallEngineProvider } from '@omni-tars/mcp-agent';
```

### 步骤 2: 更新类定义

**旧代码:**
```typescript
export class MyCustomEnginePlugin implements ToolCallEnginePlugin {
  readonly name = 'my-engine';
  readonly priority = 80;
  readonly description = 'My custom engine';

  createEngine(): ToolCallEngine {
    return new MyCustomEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    return true;
  }
}
```

**新代码:**
```typescript
export class MyCustomEngineProvider extends ToolCallEngineProvider<MyCustomEngine> {
  readonly name = 'my-engine';
  readonly priority = 80;
  readonly description = 'My custom engine';

  protected createEngine(): MyCustomEngine {
    return new MyCustomEngine();
  }

  canHandle(context: ToolCallEngineContext): boolean {
    return true;
  }
}
```

### 步骤 3: 更新使用方式

**旧代码:**
```typescript
const config: ToolCallEngineCompositionConfig = {
  engines: [
    new McpToolCallEnginePlugin(),
    new CodeToolCallEnginePlugin(),
    new GuiToolCallEnginePlugin(),
  ],
  strategy: 'priority',
};
```

**新代码:**
```typescript
const config: ToolCallEngineCompositionConfig = {
  engines: [
    new McpToolCallEngineProvider(),
    new CodeToolCallEngineProvider(),
    new GuiToolCallEngineProvider(),
  ],
  strategy: 'priority',
};
```

## 自动化迁移脚本

您可以使用以下脚本来自动化大部分迁移工作：

```bash
#!/bin/bash

# 重命名类名
find . -name "*.ts" -type f -exec sed -i '' 's/ToolCallEnginePlugin/ToolCallEngineProvider/g' {} \;

# 更新具体的类名
find . -name "*.ts" -type f -exec sed -i '' 's/McpToolCallEnginePlugin/McpToolCallEngineProvider/g' {} \;
find . -name "*.ts" -type f -exec sed -i '' 's/CodeToolCallEnginePlugin/CodeToolCallEngineProvider/g' {} \;
find . -name "*.ts" -type f -exec sed -i '' 's/GuiToolCallEnginePlugin/GuiToolCallEngineProvider/g' {} \;

# 更新实现方式（需要手动检查）
echo "请手动更新以下内容："
echo "1. implements ToolCallEngineProvider → extends ToolCallEngineProvider"
echo "2. createEngine(): ToolCallEngine → protected createEngine(): YourEngineType"
echo "3. 添加泛型类型参数"
```

## 验证迁移

### 1. 编译检查
```bash
npm run typecheck
# 或
yarn typecheck
```

### 2. 运行时检查
创建一个简单的测试来验证单例模式工作正常：

```typescript
const provider = new MyCustomEngineProvider();
const engine1 = provider.getEngine();
const engine2 = provider.getEngine();

// 应该返回同一个实例
console.assert(engine1 === engine2, 'Singleton pattern not working');
console.log('✅ 单例模式工作正常');
```

### 3. 功能测试
```typescript
// 确保所有功能正常工作
const agent = new ComposableAgent({
  composition: {
    name: 'Test Agent',
    plugins: [...],
    toolCallEngineConfig: {
      engines: [new MyCustomEngineProvider()],
      strategy: 'priority',
    },
  },
});

await agent.initialize();
const response = await agent.query('测试查询');
console.log('✅ Agent 工作正常');
```

## 新特性使用

### 1. 利用强类型支持
```typescript
class TypedEngineProvider extends ToolCallEngineProvider<MySpecificEngine> {
  protected createEngine(): MySpecificEngine {
    // TypeScript 会确保返回正确的类型
    return new MySpecificEngine();
  }
}
```

### 2. 性能监控
```typescript
class MonitoredEngineProvider extends ToolCallEngineProvider {
  protected createEngine(): ToolCallEngine {
    const start = performance.now();
    const engine = new MyEngine();
    const duration = performance.now() - start;
    
    console.log(`引擎创建耗时: ${duration}ms`);
    return engine;
  }

  getEngine(): ToolCallEngine {
    console.log('获取引擎实例（可能使用缓存）');
    return super.getEngine();
  }
}
```

## 常见问题

### Q: 为什么要从接口改为抽象类？
A: 抽象类允许我们提供默认实现（如单例模式），同时保持强制实现某些方法的能力。

### Q: 单例模式会影响并发性能吗？
A: 不会。单例模式只是避免重复创建引擎实例，对并发处理没有影响。

### Q: 如何重置引擎实例？
A: 目前不支持重置。如果需要这个功能，请提交 issue。

### Q: 可以禁用单例模式吗？
A: 不推荐，但如果确实需要，可以重写 `getEngine()` 方法：

```typescript
class NonSingletonProvider extends ToolCallEngineProvider {
  getEngine(): ToolCallEngine {
    return this.createEngine(); // 每次都创建新实例
  }

  protected createEngine(): ToolCallEngine {
    return new MyEngine();
  }
}
```

## 获得帮助

如果在迁移过程中遇到问题：

1. 查看 [完整示例](./examples/composable-tool-call-engine.ts)
2. 参考 [架构指南](./COMPOSABLE_TOOL_CALL_ENGINE_GUIDE.md)
3. 提交 issue 或联系开发团队

## 兼容性说明

- ✅ **向前兼容**: 新版本支持所有旧功能
- ✅ **渐进迁移**: 可以逐步迁移，不需要一次性全部更新
- ✅ **类型安全**: TypeScript 会在编译时提示需要更新的地方

迁移完成后，您将享受到更好的性能和开发体验！