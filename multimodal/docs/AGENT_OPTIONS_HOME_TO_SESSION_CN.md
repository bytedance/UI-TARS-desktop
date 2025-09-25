# Agent 选项和运行时设置：从首页到会话的架构设计

本文档描述了从首页（`/`）通过会话创建过程（`/creating`）到最终会话页面（`/{sessionId}`）传递 Agent 选项和运行时设置的技术实现。

## 问题背景

之前用户只能在会话创建后才能配置运行时设置，这造成了糟糕的用户体验：

1. 用户必须先开始对话才能配置 Agent 行为
2. 无法从欢迎卡片传递预定义的 Agent 选项
3. 首页和会话上下文之间的设置管理不一致

## 架构概览

解决方案实现了三阶段流程：`'/' → '/creating' → '/{sessionId}'`，支持传递运行时设置（持久化会话配置）和 Agent 选项（一次性任务配置）。

### 核心组件

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     首页        │    │   创建页面      │    │    会话页面     │
│       /         │───▶│    /creating    │───▶│   /{sessionId}  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 全局运行时设置  │    │ 带选项的会话    │    │ 带配置的活跃    │
│                 │    │     创建器      │    │     会话        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 技术实现

### 1. 全局状态管理

**文件**: `multimodal/tarko/agent-ui/src/common/state/atoms/globalRuntimeSettings.ts`

```typescript
export interface GlobalRuntimeSettingsState {
  selectedValues: Record<string, any>;
  isActive: boolean;
}

export const globalRuntimeSettingsAtom = atom<GlobalRuntimeSettingsState>({
  selectedValues: {},
  isActive: false,
});
```

**目的**：在会话创建前在内存中管理运行时设置。`isActive` 标志指示用户是否进行了任何选择。

### 2. 首页 Agent 选项选择器

**文件**: `multimodal/tarko/agent-ui/src/standalone/home/HomeAgentOptionsSelector.tsx`

```typescript
export const HomeAgentOptionsSelector = forwardRef<
  HomeAgentOptionsSelectorRef,
  HomeAgentOptionsSelectorProps
>(({ showAttachments = true, onFileUpload, className }, ref) => {
  const [globalSettings] = useAtom(globalRuntimeSettingsAtom);
  const updateGlobalSettings = useSetAtom(updateGlobalRuntimeSettingsAction);

  // 为 schema 加载创建虚拟会话元数据
  const virtualSessionMetadata = {
    runtimeSettings: globalSettings.selectedValues,
  };

  return (
    <AgentOptionsSelector
      activeSessionId="home-placeholder" // 首页的特殊占位符
      sessionMetadata={virtualSessionMetadata}
      onToggleOption={handleToggleOption}
      // ... 其他 props
    />
  );
});
```

**核心创新**：通过提供"虚拟会话"上下文复用现有的 `AgentOptionsSelector` 组件，消除代码重复并保持 UI 一致性。

### 3. 创建页面 - 会话工厂

**文件**: `multimodal/tarko/agent-ui/src/standalone/home/CreatingPage.tsx`

创建页面作为会话工厂，从多个来源接受选项：

```typescript
const createSessionWithOptions = async () => {
  // 参数来源的优先级顺序：
  // 1. 路由状态（从首页的内部导航）
  // 2. 全局运行时设置（从首页）
  // 3. URL 搜索参数（部署用户）
  
  const state = location.state as LocationState | null;
  let runtimeSettings: Record<string, any> = {}; // 持久化会话设置
  let agentOptions: Record<string, any> = {}; // 一次性任务选项
  let query: string | null = null;

  if (state) {
    // 来源 1：路由状态（最高优先级）
    runtimeSettings = state.runtimeSettings || {};
    agentOptions = state.agentOptions || {};
    query = state.query || null;
  } else if (globalSettings.isActive) {
    // 来源 2：全局运行时设置
    runtimeSettings = globalSettings.selectedValues;
    query = searchParams.get('q');
  } else {
    // 来源 3：URL 搜索参数（部署用户）
    const runtimeSettingsParam = searchParams.get('runtimeSettings');
    const agentOptionsParam = searchParams.get('agentOptions');
    // 解析 JSON 参数...
  }

  // 使用两种类型的选项创建会话
  const sessionId = await createSession(
    Object.keys(runtimeSettings).length > 0 ? runtimeSettings : undefined,
    Object.keys(agentOptions).length > 0 ? agentOptions : undefined
  );
};
```

### 4. 后端会话创建

**文件**: `multimodal/tarko/agent-server/src/api/controllers/sessions.ts`

```typescript
export async function createSession(req: Request, res: Response) {
  const { runtimeSettings, agentOptions } = req.body;
  
  // 使用运行时设置创建会话（持久化）
  const sessionInfo = await server.storageProvider.createSession({
    metadata: {
      runtimeSettings: runtimeSettings || {},
      // ... 其他元数据
    }
  });

  // 使用运行时设置和一次性选项初始化 agent
  const combinedOptions = {
    ...server.appConfig, // 基础配置
    ...runtimeSettings, // 持久化设置
    ...agentOptions     // 一次性任务选项
  };

  const agentSession = await AgentSessionFactory.create(
    sessionInfo.id,
    combinedOptions,
    server
  );

  return { sessionId: sessionInfo.id, session: sessionInfo };
}
```

### 5. 欢迎卡片集成

**文件**: `multimodal/tarko/agent-ui/src/standalone/home/WelcomeCards.tsx`

```typescript
const handleCardClick = async (card: WelcomeCard) => {
  // 使用卡片特定的 agent 选项导航
  navigate('/creating', {
    state: {
      query: card.prompt,
      agentOptions: card.agentOptions || {} // 来自卡片的预定义选项
    }
  });
};
```

**功能**：欢迎卡片现在可以包含预定义的 `agentOptions`，自动为特定任务配置 agent。

## 数据流

### 场景 1：框架开发者（内部导航）

```typescript
// 带运行时设置的首页
navigate('/creating', {
  state: {
    query: "Hello world",
    runtimeSettings: { browserMode: true },
    agentOptions: { thinkingEnabled: false }
  }
});
```

### 场景 2：部署用户（URL 参数）

```
https://your-agent.com/creating?q=Hello&runtimeSettings=%7B%22browserMode%22%3Atrue%7D&agentOptions=%7B%22thinkingEnabled%22%3Afalse%7D
```

### 场景 3：欢迎卡片选择

```typescript
// 欢迎卡片配置
{
  title: "网页浏览任务",
  prompt: "浏览网页获取信息",
  agentOptions: {
    browserMode: true,
    maxSteps: 10
  }
}
```

## 核心区别

### 运行时设置 vs Agent 选项

| 方面 | 运行时设置 | Agent 选项 |
|------|-----------|------------|
| **持久性** | 保存到会话元数据 | 仅一次性使用 |
| **作用域** | 会话级配置 | 任务特定参数 |
| **可变性** | 会话期间可更改 | 会话创建时固定 |
| **示例** | `browserMode`, `model`, `temperature` | `maxSteps`, `initialContext` |

### 前后对比

#### 之前
```
用户流程：
1. 使用默认设置开始对话
2. 意识到需要更改浏览器模式
3. 导航到设置
4. 使用新设置重新开始对话
```

#### 之后
```
用户流程：
1. 在首页配置运行时设置
2. 使用期望的配置开始对话
3. 设置自动应用到新会话
4. 继续使用优化的 agent 行为
```

## 优势

### 1. 真正的代码复用
- 复用现有的 `AgentOptionsSelector` 组件而无重复
- 保持首页和会话上下文之间的 UI 一致性
- 设置 schema 和验证的单一数据源

### 2. 灵活的架构
- 支持多种输入源（内部导航、URL 参数、欢迎卡片）
- 持久化设置和一次性选项的清晰分离
- 与现有功能向后兼容

### 3. 增强的用户体验
- 在开始对话前配置 agent 行为
- 通过欢迎卡片的预定义配置
- 从首页到会话的无缝过渡，保留设置

### 4. 开发者体验
- 类型安全的参数传递
- 关注点的清晰分离
- 可扩展的架构，便于未来增强

## 使用示例

### 框架开发者

```typescript
// 使用两种类型选项的内部导航
const handleSubmit = (content: string) => {
  navigate('/creating', {
    state: {
      query: content,
      runtimeSettings: { browserMode: true, model: "gpt-4" },
      agentOptions: { maxSteps: 5, initialContext: "web_search" }
    }
  });
};
```

### 部署用户

```bash
# 带编码参数的 URL
curl "https://your-agent.com/creating?q=Hello&runtimeSettings=%7B%22browserMode%22%3Atrue%7D"
```

### 欢迎卡片配置

```typescript
// 在 web UI 配置中
{
  welcomeCards: [
    {
      title: "代码分析",
      prompt: "分析这个代码库",
      category: "开发",
      agentOptions: {
        codeAnalysisMode: true,
        includeTests: true,
        maxFiles: 50
      }
    }
  ]
}
```

## 技术考虑

### 1. Schema 验证
- 运行时设置根据服务器端 schema 验证
- Agent 选项在 agent 初始化时验证
- 整个管道保持类型安全

### 2. 错误处理
- 解析错误时优雅回退到默认设置
- 无效配置的清晰错误消息
- 会话创建时自动清理全局状态

### 3. 性能
- 参数传递的最小开销
- 现有组件的高效复用
- 导航期间无不必要的重新渲染

### 4. 安全性
- 服务器端参数清理
- URL 参数中不暴露敏感数据
- 所有用户输入的适当验证

## 未来增强

1. **设置持久化**：跨浏览器会话保存用户偏好
2. **模板系统**：允许用户创建和保存设置模板
3. **高级验证**：设置组合的实时验证
4. **迁移工具**：旧版会话配置的自动迁移

这个架构为 agent 配置提供了坚实的基础，同时保持了关注点的清晰分离和出色的用户体验。