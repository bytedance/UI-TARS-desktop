# Event Stream 对比分析文档

## 概述

本文档分析了 `agent_trace.jsonl` 文件中的事件数据结构与 `agent-event-stream.ts` 中定义的 AgentEventStream 协议之间的差异，并提供了映射关系。

## 源数据结构分析

### 基础事件结构

源数据使用类似 OpenTelemetry 的 span 结构：

```typescript
interface SourceEvent {
  type: 'START' | 'UPDATE' | 'END';
  span_id: string;
  time_unix_nano: number;
  parent_span_id?: string;
  trace_id?: string;
  name?: string;
  attributes?: {
    inputs?: any;
    outputs?: any;
    [key: string]: any;
  };
  events?: any;
  status?: {
    code: string;
    message: any;
  };
}
```

### 事件类型分布

根据分析，源数据包含以下事件类型：
- **START**: 81 个事件 - 标记 span 开始
- **UPDATE**: 121 个事件 - 包含实际数据输出
- **END**: 81 个事件 - 标记 span 结束

### Span 名称分布

- `agent_step`: 20 个 - 代理执行步骤
- `llm`: 20 个 - LLM 调用
- `parse_tool_calls`: 20 个 - 工具调用解析
- `portal.run_action`: 12 个 - 工具执行
- `think`: 4 个 - 思考过程
- `execute_bash`: 3 个 - Bash 命令执行
- `str_replace_editor`: 2 个 - 文件编辑器

## 目标协议结构

### AgentEventStream 核心事件类型

```typescript
export type CoreEventType =
  | 'user_message'
  | 'assistant_message'
  | 'assistant_thinking_message'
  | 'assistant_streaming_message'
  | 'assistant_streaming_thinking_message'
  | 'assistant_streaming_tool_call'
  | 'tool_call'
  | 'tool_result'
  | 'system'
  | 'agent_run_start'
  | 'agent_run_end'
  | 'environment_input'
  | 'plan_start'
  | 'plan_update'
  | 'plan_finish'
  | 'final_answer'
  | 'final_answer_streaming';
```

## 映射关系分析

### 1. LLM 调用映射

**源数据模式**:
```json
{
  "type": "UPDATE",
  "span_id": "8wu0EElUIuI",
  "name": "llm",
  "attributes": {
    "outputs": {
      "content": "I'll help you...<function=execute_bash>...",
      "openai": {
        "choices": [{
          "message": { "content": "...", "role": "assistant" },
          "finish_reason": "stop"
        }],
        "usage": { "completion_tokens": 47, "prompt_tokens": 4591 }
      }
    }
  }
}
```

**映射到**:
- 如果包含 `<function=...>` → `assistant_message` + `tool_call`
- 如果是纯文本 → `assistant_message`
- 如果是思考内容 → `assistant_thinking_message`

### 2. 工具调用解析映射

**源数据模式**:
```json
{
  "type": "UPDATE",
  "span_id": "HZ1KNz540X8",
  "name": "parse_tool_calls",
  "attributes": {
    "outputs": [{
      "tool": { "name": "execute_bash" },
      "tool_call_id": null,
      "params": { "command": "pwd && ls" }
    }]
  }
}
```

**映射到**: `tool_call` 事件

### 3. 工具执行结果映射

**源数据模式**:
```json
{
  "type": "UPDATE",
  "span_id": "oCbbxUqNPh4",
  "name": "portal.run_action",
  "attributes": {
    "outputs": {
      "result": "/workspace\n[Current working directory: /workspace]...",
      "data": {
        "status": "Finished",
        "execution_time": 0.0032253265380859375,
        "return_code": 0,
        "stdout": "/workspace\n",
        "stderr": ""
      }
    }
  }
}
```

**映射到**: `tool_result` 事件

### 4. 代理步骤映射

**源数据模式**:
```json
{
  "type": "START",
  "span_id": "tKIO0A7Euhg",
  "name": "agent_step",
  "attributes": { "step": 1 }
}
```

**映射到**: `agent_run_start` / `agent_run_end` 事件

## 关键设计差异

### 1. 事件粒度

- **源数据**: 基于 span 的三阶段模型 (START/UPDATE/END)
- **目标协议**: 基于语义的单一事件模型

### 2. 时间戳格式

- **源数据**: `time_unix_nano` (纳秒精度)
- **目标协议**: `timestamp` (毫秒精度)

### 3. 事件标识

- **源数据**: `span_id` + `trace_id`
- **目标协议**: 单一 `id` 字段

### 4. 工具调用处理

- **源数据**: 分离的解析和执行阶段
- **目标协议**: 统一的 `tool_call` + `tool_result` 模型

### 5. 内容解析

- **源数据**: 原始 LLM 输出，需要解析 `<function=...>` 标记
- **目标协议**: 结构化的 `toolCalls` 数组

## 转换挑战

### 1. Function Call 解析

源数据中的 function call 以特殊格式嵌入在文本中：
```
<function=execute_bash>
<parameter=command>pwd && ls</parameter>
</function>
```

需要解析为标准的 `ChatCompletionMessageToolCall` 格式。

### 2. 事件关联

源数据通过 `span_id` 和 `parent_span_id` 建立关联，需要转换为目标协议的 `toolCallId` 关联。

### 3. 时序重建

源数据的 START/UPDATE/END 模式需要重建为目标协议的线性事件流。

### 4. 内容分离

需要将混合的助手消息和工具调用分离为独立的事件。

## 转换策略

1. **事件收集**: 按 `span_id` 分组收集 START/UPDATE/END 事件
2. **语义解析**: 根据 `name` 和 `attributes` 确定事件语义
3. **内容提取**: 从 `attributes.outputs` 提取相关数据
4. **Function Call 解析**: 解析文本中的 `<function=...>` 标记
5. **事件生成**: 生成符合目标协议的事件
6. **关联建立**: 通过时序和 span 关系建立事件关联

## 实现重点

1. **正则表达式解析**: 用于提取 function call
2. **状态机**: 跟踪工具调用的生命周期
3. **时间转换**: 纳秒到毫秒的时间戳转换
4. **ID 生成**: 为目标事件生成唯一标识符
5. **错误处理**: 处理不完整或异常的 span 数据

## 实际使用

### 使用 AGUI CLI 转换

```bash
# 构建 CLI
cd multimodal/tarko/agent-ui-cli
npm run build

# 转换 JSONL 到 HTML
cd examples/test
node ../../dist/cli.js agent_trace.jsonl --transformer transformer.ts --out agent_trace.html
```

### 关键优势

1. **原生 JSONL 支持**: AGUI CLI 自动识别和解析 JSONL 格式
2. **TypeScript Transformer**: 支持类型安全的转换逻辑
3. **实时转换**: 无需预处理，直接从 JSONL 生成 HTML
4. **完整映射**: 保留所有关键信息和时序关系

### 转换结果

转换后的 HTML 文件包含：
- 交互式时间线视图
- 完整的工具调用链
- LLM 对话历史
- 思考过程可视化
- 性能指标和统计信息
