import {
  getLogger,
  Tool,
  ToolCallEngine,
  ToolCallEnginePrepareRequestContext,
} from '@multimodal/agent';
import {
  AgentEventStream,
  ChatCompletionAssistantMessageParam,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  MultimodalToolCallResult,
  ParsedModelResponse,
  StreamChunkResult,
  StreamProcessingState,
} from '@multimodal/agent-interface';

export class SeedMCPAgentToolCallEngine extends ToolCallEngine {
  private logger = getLogger('SeedMCPAgentToolCallEngine');

  preparePrompt(instructions: string, tools: Tool[]): string {
    // return `${instructions}\n\n${tools.map((tool) => tool.description).join('\n\n')}`;
    return instructions;
  }
  prepareRequest(context: ToolCallEnginePrepareRequestContext): ChatCompletionCreateParams {
    return {
      model: context.model,
      messages: context.messages,
      temperature: context.temperature || 0.7,
      stream: true,
    };
  }

  processStreamingChunk(
    chunk: ChatCompletionChunk,
    state: StreamProcessingState,
  ): StreamChunkResult {
    const delta = chunk.choices[0]?.delta;

    // this.logger.debug('delta: ', delta);

    // Accumulate content
    if (delta?.content) {
      state.contentBuffer += delta.content;
    }

    // Record finish reason
    if (chunk.choices[0]?.finish_reason) {
      state.finishReason = chunk.choices[0].finish_reason;
    }

    // Return incremental content without tool call detection during streaming
    return {
      content: delta?.content || '',
      reasoningContent: '',
      hasToolCallUpdate: false,
      toolCalls: [],
    };
  }
  finalizeStreamProcessing(state: StreamProcessingState): ParsedModelResponse {
    const fullContent = state.contentBuffer;
    this.logger.debug('finalizeStreamProcessing conent', fullContent);

    const extracted = this.parseContent(fullContent);

    this.logger.debug('extracted', JSON.stringify(extracted, null, 2));

    const { think, tools, answer } = extracted;

    return {
      content: answer ?? fullContent,
      rawContent: fullContent,
      reasoningContent: think ?? '',
      toolCalls: tools,
      finishReason: tools.length > 0 ? 'tool_calls' : 'stop',
    };
  }

  /**
   * Generate a tool call ID
   */
  private generateToolCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * extract informations from llm response
   * @param content string contains think, FunctionCall, answer
   */
  private parseContent(content: string): {
    answer: string;
    think: string;
    tools: ChatCompletionMessageToolCall[];
  } {
    //     const resp1 = `<mcp_env>
    // <|FunctionCallBegin|>用户需要了解北京当前的天气情况，使用Search工具搜索相关信息，查询词设为"北京当前天气"能获取准确结果。</think>[{"name":"Search","parameters":{"query":"北京当前天气"}}]<|FunctionCallEnd|>
    // </mcp_env>`;

    //     const resp2 = `<mcp_env>
    // <think> I need to search information about Season 2015/16 Stats UEFA Champions League top goal scoring teams </think>
    // <|FunctionCallBegin|>[{"name":"Search","parameters":{"query":"Season 2015/16 Stats UEFA Champions League top goal scoring teams"}}]<|FunctionCallEnd|>
    // </mcp_env>`;

    //     const resp3 = `<think> thinking </think><answer> final answer </answer>`;

    let think = '';
    let answer = '';
    let tools: ChatCompletionMessageToolCall[] = [];

    try {
      // 解析 think 内容
      const thinkMatch = content.match(/<think>(.*?)<\/think>/s);
      if (thinkMatch) {
        think = thinkMatch[1].trim();
      }

      // 解析 answer 内容
      const answerMatch = content.match(/<answer>(.*?)<\/answer>/s);
      if (answerMatch) {
        answer = answerMatch[1].trim();
      }

      // 解析工具调用 - 处理 FunctionCallBegin/End 格式
      const functionCallMatch = content.match(/<\|FunctionCallBegin\|>(.*?)<\|FunctionCallEnd\|>/s);
      if (functionCallMatch) {
        const functionCallContent = functionCallMatch[1];

        // 从内容中提取 JSON 数组部分
        const jsonMatch = functionCallContent.match(/\[.*\]/s);
        if (jsonMatch) {
          try {
            const toolCallsData = JSON.parse(jsonMatch[0]);
            tools = toolCallsData.map(
              (toolCall: { name: string; parameters?: Record<string, unknown> }) => ({
                id: this.generateToolCallId(),
                type: 'function' as const,
                function: {
                  name: toolCall.name,
                  arguments: JSON.stringify(toolCall.parameters || {}),
                },
              }),
            );
          } catch (parseError) {
            this.logger.warn('Failed to parse tool calls JSON:', parseError);
          }
        }
      } else {
        // 处理新格式：<|FunctionCallBegin|>思考内容</think>\n[JSON数组]\n</mcp_env>
        const newFormatMatch = content.match(/<\|FunctionCallBegin\|>(.*?)<\/think>\s*(\[.*?\])/s);
        if (newFormatMatch) {
          // 提取思考内容（如果之前没有通过 <think> 标签提取到）
          if (!think) {
            think = newFormatMatch[1].trim();
          }

          // 提取并解析 JSON 数组
          try {
            const toolCallsData = JSON.parse(newFormatMatch[2]);
            tools = toolCallsData.map(
              (toolCall: { name: string; parameters?: Record<string, unknown> }) => ({
                id: this.generateToolCallId(),
                type: 'function' as const,
                function: {
                  name: toolCall.name,
                  arguments: JSON.stringify(toolCall.parameters || {}),
                },
              }),
            );
          } catch (parseError) {
            this.logger.warn('Failed to parse new format tool calls JSON:', parseError);
          }
        }
      }

      // 如果没有找到 answer 标签，但有内容且没有工具调用，则将整个内容作为 answer
      if (!answer && !tools.length && content.trim()) {
        // 移除 think 部分后的剩余内容作为 answer
        let remainingContent = content;
        if (thinkMatch) {
          remainingContent = content.replace(/<think>.*?<\/think>/s, '').trim();
        }
        if (remainingContent) {
          answer = remainingContent;
        }
      }
    } catch (error) {
      this.logger.error('Error parsing content:', error);
      // 如果解析失败，返回原始内容作为 answer
      answer = content;
    }

    return {
      think,
      tools,
      answer,
    };
  }

  initStreamProcessingState(): StreamProcessingState {
    return {
      contentBuffer: '',
      toolCalls: [],
      reasoningBuffer: '',
      finishReason: null,
    };
  }

  buildHistoricalAssistantMessage(
    currentLoopAssistantEvent: AgentEventStream.AssistantMessageEvent,
  ): ChatCompletionAssistantMessageParam {
    return {
      role: 'assistant',
      content: currentLoopAssistantEvent.rawContent || currentLoopAssistantEvent.content,
    };
  }

  buildHistoricalToolCallResultMessages(
    toolCallResults: MultimodalToolCallResult[],
  ): ChatCompletionMessageParam[] {
    return toolCallResults.map((result) => {
      // Extract text content from multimodal result
      const textContent = result.content
        .filter((part) => part.type === 'text')
        .map((part) => (part as { text: string }).text)
        .join('');

      return {
        role: 'user',
        content: `Tool "${result.toolName}" result:\n${textContent}`,
      };
    });
  }
}
