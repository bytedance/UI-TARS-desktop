# Agent Snapshot

Agent Snapshot 是 Tarko Agent Framework 的核心调试功能。

## 迁移通知

此文档已迁移到 Tarko 文档站，请访问：

**📖 [Tarko Agent Snapshot 文档](https://tarko.ai/zh/guide/advanced/agent-snapshot)**

## 快速链接

- [Agent Snapshot 概述](https://tarko.ai/zh/guide/advanced/agent-snapshot#什么是-agent-snapshot)
- [创建快照](https://tarko.ai/zh/guide/advanced/agent-snapshot#创建快照)
- [回放快照](https://tarko.ai/zh/guide/advanced/agent-snapshot#回放快照)
- [调试最佳实践](https://tarko.ai/zh/guide/advanced/agent-snapshot#使用快照调试)

## 在 Agent TARS 中的使用

在 Agent TARS 中启用 Agent Snapshot：

```ts
// agent-tars.config.ts
import { resolve } from 'node:path';
import { defineConfig } from '@agent-tars/interface';

export default defineConfig({
  // ...
  snapshot: {
    enable: true,
    storageDirectory: resolve(__dirname, 'snapshots')
  }
});
```

更多详细配置和使用方法，请参考 [Tarko 文档](https://tarko.ai/zh/guide/advanced/agent-snapshot)。
