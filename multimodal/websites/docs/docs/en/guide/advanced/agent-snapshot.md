# Agent Snapshot

## When to use?

If you find some bugs of Agent TARS, you want to know to underlying request, you can use this feature to help you trouble shoot it.

## Quick Start

### 1. 示例

让我们以一个典型的例子来向你表达 Agent Snapshot 的作用。考虑到不同 Model Provider 的巨大差异，完美地兼容所有模型是一项非常复杂且长期的工作，有时你可能会遇到一些意外的 LLM 调用错误，比如：

```
[Stream] Error in agent loop execution: Error: 400 operation error Bedrock Runtime: ConverseStream, https response error StatusCode: 400, RequestID: 31427985-ebcf-4321-af29-d498c474a20f, ValidationException: The json schema definition at toolConfig.tools.13.toolSpec.inputSchema is invalid. Fix the following errors and try again: $.properties: null found, object expected
```
### 2. 开启 Snapshot

此时，你可以通过 Global Workspace 的 Config 来开启 Agent Snapshot:

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

接着，你将能够在 Global Workspace 中找到所有的状态，包含每一轮的 LLM Request、LLM Response：

```bash
snapshots
└── c3fMyx8jePXnhjYvHOhKr           # Session id
    ├── event-stream.jsonl          # Final event stream
    ├── loop-1                      # Loop 1
    │   ├── event-stream.jsonl
    │   ├── llm-request.jsonl
    │   ├── llm-response.jsonl
    │   └── tool-calls.jsonl
    ├── loop-2                      # Loop 2
    │   ├── event-stream.jsonl
    │   ├── llm-request.jsonl
    │   ├── llm-response.jsonl
    │   └── tool-calls.jsonl
    └── loop-3                      # Loop 3
        ├── event-stream.jsonl
        ├── llm-request.jsonl
        └── llm-response.jsonl
```

### 3. 分析 Snapshot

在上面的问题中，我们把 `loop-1/llm-request.jsonl` 和保存信息一起扔给 LLM，LLM 会很快给出答案

> AWS Bedrock 要求 JSON Schema 中当 type 为 "object" 时，必须包含一个 properties 字段（即使为空）。但这里的参数定义中缺少了 properties 字段。

解决方案：需要修改 `browser_get_clickable_elements` 工具的参数定义，添加空的 properties 对象：

```diff
"type": "function",
"function": {
    "name": "browser_get_clickable_elements",
    "description": "[browser] Get the clickable or hoverable or selectable elements on the current page, don't call this tool multiple times",
    "parameters": {
        "type": "object",
+       "properties": {}
    }
}
```

这便是 Agent TARS 在迭代中的一个真实例子，详见 [#770](https://github.com/bytedance/UI-TARS-desktop/pull/770)。

## 总结

Agent Snapshot 为 Agent TARS 创造了 "白盒化"，我们期望此能力能够让更多的人参与到 Agent TARS 的建设中来。