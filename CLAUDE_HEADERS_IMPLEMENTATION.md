# Claude Headers 自动配置架构实现方案

## 需求分析

**原始需求**：检测到 Claude 模型时，在 LLM Client 的 headers 上自动默认加上：
```javascript
anthropic_beta = [
  'fine-grained-tool-streaming-2025-05-14',
  'token-efficient-tools-2025-02-19',
];
```

## 架构设计原则

### 1. 单一职责原则 (SRP)
- `HeaderConfigRegistry`: 负责管理所有提供商的 header 配置
- `ClaudeModelDetector`: 负责 Claude 模型检测和特性管理
- `AnthropicHandler`: 负责处理 Anthropic API 调用

### 2. 开放封闭原则 (OCP)
- 对扩展开放：可轻松添加新的提供商配置
- 对修改封闭：现有代码无需修改即可支持新特性

### 3. 依赖注入原则 (DIP)
- 配置驱动而非硬编码
- 通过注册表管理依赖关系

### 4. 接口隔离原则 (ISP)
- 清晰的接口定义
- 最小化接口依赖

## 核心组件架构

### 1. 配置管理层 (`src/config/`)

#### HeaderConfigRegistry
```typescript
class HeaderConfigRegistry {
  // 注册提供商配置
  static register(provider: LLMProvider, config: ProviderHeaderConfig): void
  
  // 获取提供商配置
  static get(provider: LLMProvider): ProviderHeaderConfig | undefined
  
  // 生成最终 headers
  static generateHeaders(provider: LLMProvider, model: string, params?: any): Record<string, string>
}
```

**设计优势**：
- 中心化管理：所有 header 配置集中管理
- 类型安全：完整的 TypeScript 类型定义
- 易于测试：静态方法便于单元测试

#### ProviderHeaderConfig 接口
```typescript
interface ProviderHeaderConfig {
  static?: Record<string, string>;           // 静态 headers
  dynamic?: (model: string) => Record<string, string>;  // 基于模型的动态 headers
  conditional?: (params: any) => Record<string, string>; // 基于请求参数的条件 headers
}
```

**设计优势**：
- 灵活性：支持三种不同类型的 header 生成策略
- 扩展性：可轻松添加新的 header 生成逻辑
- 可组合：多种策略可同时使用

### 2. 模型检测层

#### ClaudeModelDetector
```typescript
class ClaudeModelDetector {
  private static readonly CLAUDE_MODEL_PATTERNS = [
    /^claude-/i,
    /^anthropic\//i,
  ];
  
  static isClaudeModel(model: string): boolean
  static getClaudeBetaFeatures(): string[]
}
```

**设计优势**：
- 模式匹配：支持多种 Claude 模型命名规范
- 集中管理：所有 Claude 相关逻辑集中在一处
- 易于维护：新模型或特性只需在此处更新

### 3. 集成层

#### ConfigOptions 扩展
```typescript
export type ConfigOptions = Pick<ClientOptions, 'apiKey' | 'baseURL'> & {
  headers?: Record<string, string>;    // 用户自定义 headers
  autoHeaders?: boolean;               // 启用/禁用自动 headers
  // ... 其他配置
};
```

#### AnthropicHandler 集成
```typescript
// 生成提供商特定 headers
const providerHeaders = this.opts.autoHeaders !== false 
  ? HeaderConfigRegistry.generateHeaders('anthropic', body.model, body)
  : {};

// 与用户定义的 headers 合并
const headers = {
  ...providerHeaders,
  ...this.opts.headers,
};

// 创建 Anthropic 客户端
const client = new Anthropic({ 
  apiKey: getApiKey(this.opts.apiKey)!,
  defaultHeaders: headers,
});
```

## 数据流设计

```
用户创建 TokenJS 实例
      ↓
初始化默认配置 (initializeDefaultConfigs)
      ↓
注册 Anthropic 配置到 HeaderConfigRegistry
      ↓
用户发起 API 调用
      ↓
AnthropicHandler.create() 被调用
      ↓
HeaderConfigRegistry.generateHeaders() 生成 headers
      ↓
与用户自定义 headers 合并
      ↓
创建 Anthropic 客户端并发起请求
```

## 配置策略设计

### Anthropic 配置实现
```typescript
HeaderConfigRegistry.register('anthropic', {
  // 动态 headers：基于模型检测
  dynamic: (model: string) => {
    if (ClaudeModelDetector.isClaudeModel(model)) {
      return {
        'anthropic-beta': ClaudeModelDetector.getClaudeBetaFeatures().join(',')
      };
    }
    return {};
  },
  
  // 条件 headers：基于请求参数
  conditional: (params) => {
    if (params?.tools && ClaudeModelDetector.isClaudeModel(params.model)) {
      // 确保工具调用时启用相关特性
      return { /* 额外的工具相关 headers */ };
    }
    return {};
  }
});
```

## 扩展性设计

### 1. 新提供商支持
```typescript
// 添加 OpenAI 配置示例
HeaderConfigRegistry.register('openai', {
  static: { 'X-Provider': 'openai' },
  dynamic: (model) => ({ 'X-Model': model }),
  conditional: (params) => {
    if (params.temperature > 0.8) {
      return { 'X-High-Temperature': 'true' };
    }
    return {};
  }
});
```

### 2. 新特性支持
```typescript
// 更新 Claude beta 特性
static getClaudeBetaFeatures(): string[] {
  return [
    'fine-grained-tool-streaming-2025-05-14',
    'token-efficient-tools-2025-02-19',
    'new-feature-2025-06-01',  // 新特性
  ];
}
```

## 测试策略

### 1. 单元测试
- `HeaderConfigRegistry` 的注册和生成逻辑
- `ClaudeModelDetector` 的模型检测逻辑
- 配置初始化逻辑

### 2. 集成测试
- 完整的 header 生成和应用流程
- 用户配置与自动配置的合并逻辑
- 不同场景下的 header 行为

### 3. 测试覆盖场景
- ✅ 自动 header 添加
- ✅ 用户自定义 header 合并
- ✅ 禁用自动 headers
- ✅ 条件 headers（工具调用）
- ✅ 非 Claude 模型处理
- ✅ 流式请求支持
- ✅ 用户 header 覆盖自动 header

## 性能考虑

### 1. 惰性初始化
- 配置仅在首次使用时初始化
- 避免不必要的计算开销

### 2. 缓存策略
- 模型检测结果可缓存
- 生成的 headers 可缓存（未来优化）

### 3. 内存管理
- 使用静态方法减少实例创建
- 配置对象复用

## 向后兼容性

### 1. 无破坏性变更
- 现有 API 保持不变
- 新功能通过可选配置启用

### 2. 渐进式采用
- 默认启用自动 headers
- 用户可选择禁用或自定义

### 3. 迁移路径
```typescript
// 旧代码（仍然有效）
const client = new TokenJS({ apiKey: 'key' });

// 新功能（自动启用）
const client = new TokenJS({ 
  apiKey: 'key',
  // headers 自动管理
});

// 高级配置
const client = new TokenJS({ 
  apiKey: 'key',
  headers: { 'X-Custom': 'value' },
  autoHeaders: true  // 显式启用
});
```

## 部署和维护

### 1. 配置更新
- 新的 beta 特性可通过代码更新添加
- 配置变更不影响现有功能

### 2. 监控和调试
- 完整的测试覆盖确保稳定性
- 清晰的错误处理和日志

### 3. 文档和示例
- 完整的 API 文档
- 实用的代码示例
- 迁移指南

## 总结

这个架构设计实现了一个**高度可扩展、类型安全、向后兼容**的 header 管理系统：

### ✅ 解决了原始需求
- 自动为 Claude 模型添加 `anthropic-beta` headers
- 支持指定的 beta 特性

### ✅ 提供了架构优势
- **可扩展**：轻松支持新提供商和特性
- **可配置**：用户完全控制 header 行为
- **类型安全**：完整的 TypeScript 支持
- **可测试**：全面的测试覆盖
- **可维护**：清晰的代码结构和文档

### ✅ 保证了质量
- 无破坏性变更
- 高性能实现
- 全面的错误处理
- 详细的文档和示例

这不仅仅是一个简单的功能实现，而是一个为未来扩展打下坚实基础的架构设计。
