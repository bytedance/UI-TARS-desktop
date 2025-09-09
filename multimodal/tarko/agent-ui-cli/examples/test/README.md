# Agent Trace Transformer

这个示例展示了如何将 `agent_trace.jsonl` 文件转换为 AgentEventStream 格式，并生成可视化的 HTML 报告。

## 文件说明

- `agent_trace.jsonl` - 源数据文件（OpenTelemetry 风格的 span 事件）
- `transformer.ts` - 主要的转换器实现
- `test-transformer.ts` - 测试脚本
- `dump-html.ts` - HTML 可视化生成器
- `event-stream-comparison.md` - 详细的协议对比分析文档
- `analyze_*.js` - 数据分析脚本

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 分析源数据

```bash
# 分析整体模式
npm run analyze

# 分析特定行
node analyze_trace.js 3
node detailed_analyze.js 3
```

### 3. 测试转换器

```bash
npm test
```

这会：
- 读取 `agent_trace.jsonl`
- 转换为 AgentEventStream 事件
- 输出统计信息
- 保存结果到 `transformed_events.json`

### 4. 生成 HTML 可视化

```bash
npm run dump
```

这会生成 `agent_trace_visualization.html` 文件，在浏览器中打开即可查看可视化结果。

## 转换器功能

### 支持的事件类型转换

| 源数据 | 目标事件类型 | 说明 |
|--------|-------------|------|
| `llm` span with content | `assistant_message` | LLM 响应消息 |
| `llm` span with `<function=think>` | `assistant_thinking_message` | 思考过程 |
| `parse_tool_calls` span | `tool_call` | 工具调用 |
| `portal.run_action` span | `tool_result` | 工具执行结果 |
| `agent_step` start | `agent_run_start` | 代理执行开始 |
| `agent_step` end | `agent_run_end` | 代理执行结束 |

### Function Call 解析

转换器能够解析源数据中的特殊格式：

```
<function=execute_bash>
<parameter=command>pwd && ls</parameter>
</function>
```

转换为标准的 `ChatCompletionMessageToolCall` 格式：

```json
{
  "id": "tool-call-123",
  "type": "function",
  "function": {
    "name": "execute_bash",
    "arguments": "{\"command\": \"pwd && ls\"}"
  }
}
```

### 事件关联

- 通过 `span_id` 和 `parent_span_id` 建立事件关联
- 生成唯一的 `toolCallId` 关联工具调用和结果
- 维护时序关系和消息 ID

## HTML 可视化功能

生成的 HTML 文件包含：

- 📊 **统计概览** - 事件类型分布
- 🔍 **搜索过滤** - 按事件类型或内容搜索
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 🎨 **语法高亮** - 代码和 JSON 内容高亮
- 📋 **详细信息** - 每个事件的完整元数据

### 事件颜色编码

- 🔵 用户消息 - 蓝色
- 🟣 助手消息 - 紫色
- 🟠 思考消息 - 橙色
- 🟢 工具调用 - 绿色
- 🟡 工具结果 - 黄绿色
- 🔰 运行开始 - 青色
- 🔴 运行结束 - 粉色

## 数据结构对比

详细的协议对比分析请参考 [event-stream-comparison.md](./event-stream-comparison.md)。

### 关键差异

1. **事件粒度**：源数据使用 START/UPDATE/END 三阶段，目标协议使用单一语义事件
2. **时间戳**：纳秒精度 → 毫秒精度
3. **工具调用**：文本嵌入格式 → 结构化对象
4. **事件标识**：span_id + trace_id → 单一 id

## 扩展和自定义

### 添加新的事件类型

1. 在 `transformer.ts` 中添加新的处理逻辑
2. 在 `dump-html.ts` 中添加对应的 HTML 生成逻辑
3. 更新颜色编码和样式

### 自定义 HTML 模板

修改 `dump-html.ts` 中的 `generateHTML` 函数来自定义：
- 样式和布局
- 事件展示格式
- 交互功能

## 故障排除

### 常见问题

1. **文件不存在错误**
   ```
   Error: agent_trace.jsonl not found
   ```
   确保 `agent_trace.jsonl` 文件存在于当前目录。

2. **解析错误**
   ```
   Error parsing line: Unexpected token
   ```
   检查 JSONL 文件格式，确保每行都是有效的 JSON。

3. **类型错误**
   ```
   TypeError: Cannot read property of undefined
   ```
   可能是源数据结构发生变化，需要更新转换器逻辑。

### 调试技巧

1. 使用分析脚本检查源数据结构：
   ```bash
   node detailed_analyze.js 1
   ```

2. 查看转换后的原始 JSON：
   ```bash
   cat transformed_events.json | jq .
   ```

3. 启用详细日志：
   在转换器中添加 `console.log` 语句跟踪处理过程。

## 性能考虑

- 大文件处理：对于大型 JSONL 文件，考虑使用流式处理
- 内存使用：转换器会将所有事件加载到内存中
- HTML 生成：大量事件可能导致 HTML 文件过大

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个转换器！
