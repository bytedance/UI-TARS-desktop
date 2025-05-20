import { AgentService, createAgentService, agentService as realAgentService } from './agentService';
import { EventStreamProcessor, eventProcessor } from './eventStreamProcessor';
import { EventType, Event } from '@multimodal/agent';
import type { AgentStep, AgentIntermediateBlock } from '../types/chat';

/**
 * Wrapper to provide unified interface for both mock and real agent services
 * Maintains compatibility with existing code while enabling real server integration
 */
class AgentServiceAdapter {
  private agentService: AgentService;
  private eventProcessor: EventStreamProcessor;
  private useMock: boolean;
  private activeSessionId: string | null = null;
  private stepRegistry: Map<string, AgentStep> = new Map();

  constructor() {
    this.agentService = realAgentService;
    this.eventProcessor = eventProcessor;
    // Use mock in development if explicitly set
    this.useMock = false;
  }

  /**
   * Set mode to mock or real service
   */
  setMockMode(useMock: boolean): void {
    this.useMock = useMock;
  }

  /**
   * Get or create an agent session
   */
  async getSession(): Promise<string> {
    if (this.activeSessionId) {
      return this.activeSessionId;
    }

    if (this.useMock) {
      // Create mock session ID
      this.activeSessionId = `mock_session_${Date.now()}`;
      return this.activeSessionId;
    }

    // Create real session
    try {
      this.activeSessionId = await this.agentService.createSession();
      return this.activeSessionId;
    } catch (error) {
      console.error('Failed to create session, falling back to mock:', error);
      this.useMock = true;
      this.activeSessionId = `mock_session_${Date.now()}`;
      return this.activeSessionId;
    }
  }

  /**
   * Stream chat with the agent, handling both mock and real modes
   */
  async streamChat(
    model: string,
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    options?: {
      model?: string;
      onStateUpdate?: (state: any) => void;
    },
  ): Promise<void> {
    // Reset step registry for new conversation
    this.stepRegistry.clear();

    if (this.useMock) {
      // Call the original mock implementation
      return this.mockStreamChat(model, messages, onChunk, onError, options);
    }

    try {
      // Get or create session
      const sessionId = await this.getSession();

      // Get the last user message
      const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
      if (!lastUserMessage) {
        throw new Error('No user message found');
      }

      // Set up event handler for streaming events
      const handleEvent = (event: Event) => {
        // Process assistant streaming messages directly to UI
        if (event.type === EventType.ASSISTANT_STREAMING_MESSAGE) {
          onChunk(
            typeof event.content === 'string' ? event.content : JSON.stringify(event.content),
          );
        }

        // Process other events for UI state updates
        if (options?.onStateUpdate) {
          const state = this.eventProcessor.processEvent(event);
          if (state) {
            // For step updates, merge with existing steps
            if (state.type === 'steps' && state.steps) {
              const updatedState = this.mergeStepUpdates(state);
              options.onStateUpdate(updatedState);
            }
            // For other updates, pass through
            else {
              options.onStateUpdate(state);
            }

            // For tool results, try to generate canvas visualization
            if (event.type === EventType.TOOL_RESULT && event.content) {
              const canvasState = this.eventProcessor.generateCanvasContent(
                event.name,
                event.content,
              );

              if (canvasState) {
                options.onStateUpdate(canvasState);
              }
            }
          }
        }
      };

      // Connect to WebSocket for real-time updates if new session
      this.agentService.connectToSession(sessionId, handleEvent);

      // Send the query to the streaming endpoint
      await this.agentService.streamQuery(sessionId, lastUserMessage.content, handleEvent, onError);
    } catch (error) {
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Merge new step updates with existing step registry
   */
  private mergeStepUpdates(state: any): any {
    if (!state.steps || !Array.isArray(state.steps)) {
      return state;
    }

    // Update registry with new steps
    state.steps.forEach((step: AgentStep) => {
      this.stepRegistry.set(String(step.id), step);
    });

    // Return updated state with all tracked steps
    return {
      ...state,
      steps: Array.from(this.stepRegistry.values()),
    };
  }

  /**
   * Original mock implementation (preserved for compatibility)
   */
  private async mockStreamChat(
    model: string,
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    options?: {
      onStateUpdate?: (state: any) => void;
    },
  ): Promise<void> {
    try {
      // 获取用户最后一条消息
      const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content || '';

      // 模拟思考状态
      options?.onStateUpdate?.({ type: 'thinking', content: '思考中...' });

      // 检查是否需要触发多步骤任务的关键词
      const taskKeywords = [
        '执行任务',
        '分析',
        '生成报告',
        'task',
        '多步骤',
        '处理',
        '帮我',
        '创建',
      ];

      const shouldShowSteps = taskKeywords.some((keyword) =>
        lastUserMessage.toLowerCase().includes(keyword.toLowerCase()),
      );

      // 检查是否需要触发 Canvas 显示的关键词
      const canvasKeywords = [
        '代码',
        'UI',
        '设计',
        '网站',
        '界面',
        '创建',
        '模型',
        '预览',
        'canvas',
      ];

      // 如果包含相关关键词，则触发 Canvas 视图
      const shouldShowCanvas = canvasKeywords.some((keyword) =>
        lastUserMessage.toLowerCase().includes(keyword.toLowerCase()),
      );

      // 生成响应文本
      let response = '';

      // 修改顺序：先触发步骤和Canvas，然后再流式传输文本
      if (shouldShowSteps) {
        // 初始化步骤
        const steps = this.generateMockSteps(lastUserMessage);

        // 通知前端显示步骤 - 在文本之前
        options?.onStateUpdate?.({
          type: 'steps',
          content: '开始执行多步骤任务',
          steps: steps,
        });

        // 模拟步骤执行
        await this.simulateStepExecution(steps, options?.onStateUpdate);

        response = '我已经完成了所有步骤，以下是任务的结果摘要。';

        // 如果需要显示Canvas，也放在文本之前
        if (shouldShowCanvas) {
          const blocks = this.generateMockBlocks(lastUserMessage);
          options?.onStateUpdate?.({
            type: 'canvas',
            content: '展示设计视图',
            blocks: blocks,
          });
          response += '你可以在右侧面板查看详细的分析结果。';
        }
      } else if (shouldShowCanvas) {
        // 触发 Canvas 视图
        const blocks = this.generateMockBlocks(lastUserMessage);

        // 通知前端显示 Canvas
        options?.onStateUpdate?.({
          type: 'canvas',
          content: '展示设计视图',
          blocks: blocks,
        });

        response = '我已经为你创建了一些设计预览，请查看右侧面板获取更多详细信息。';
      } else if (
        lastUserMessage.toLowerCase().includes('hello') ||
        lastUserMessage.toLowerCase().includes('hi')
      ) {
        response = '你好！我是 UI-TARS，有什么我可以帮助你的吗？';
      } else if (lastUserMessage.toLowerCase().includes('ui-tars')) {
        response =
          'UI-TARS 是一个基于视觉语言模型的智能助手，能够理解界面和图像内容，帮助用户完成各种任务。';
      } else if (lastUserMessage.toLowerCase().includes('help')) {
        response =
          '我可以帮助你回答问题、提供建议、解释概念，或者协助完成特定任务。请告诉我你需要什么帮助？';
      } else {
        response = `我收到了你的消息："${lastUserMessage}"。请问有什么我可以帮你的吗？`;
      }

      // 模拟打字效果，逐字返回内容
      for (let i = 0; i < response.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        onChunk(response[i]);
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'));
    }
  }

  // Preserved mock helpers
  private async simulateStepExecution(
    steps: AgentStep[],
    onStateUpdate?: (state: any) => void,
  ): Promise<void> {
    // 开始第一个步骤
    let currentStepIndex = 0;
    let currentSteps = [...steps];

    // 为测试准备 Canvas 块
    const blocks = this.generateMockBlocks('用户请求');

    // 先发送一次Canvas块，确保blocks在前端可用
    onStateUpdate?.({
      type: 'canvas',
      content: '展示设计视图',
      blocks: blocks,
    });

    while (currentStepIndex < currentSteps.length) {
      // 确保每个步骤都有关联的 artifactId
      if (!currentSteps[currentStepIndex].artifactId) {
        currentSteps[currentStepIndex].artifactId =
          `block-${(currentStepIndex % blocks.length) + 1}`;
      }

      // 更新当前步骤状态为进行中
      currentSteps[currentStepIndex].status = 'in-progress';

      // 更新状态
      onStateUpdate?.({
        type: 'steps',
        content: '执行中...',
        steps: currentSteps,
      });

      // 也将 Canvas 内容再次发送，确保 Canvas 可以显示
      onStateUpdate?.({
        type: 'canvas',
        content: '展示设计视图',
        blocks: blocks,
      });

      // 模拟步骤执行时间 (1-2秒)
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

      // 步骤完成
      currentSteps[currentStepIndex].status = 'completed';

      // 更新状态以显示完成的步骤
      onStateUpdate?.({
        type: 'steps',
        content: '步骤完成...',
        steps: [...currentSteps],
      });

      // 准备下一个步骤
      currentStepIndex++;

      // 检查是否需要动态添加新步骤 (随机决定，约25%概率)
      if (currentStepIndex < currentSteps.length && Math.random() < 0.25) {
        // 创建一个新的步骤
        const newStep = {
          id: currentSteps.length + 1,
          title: `额外任务 ${currentSteps.length + 1}`,
          description: '这是根据任务进展动态添加的新步骤',
          status: 'pending' as const,
          artifactId: `block-${(currentSteps.length % blocks.length) + 1}`,
        };

        // 添加到当前步骤列表
        currentSteps = [
          ...currentSteps.slice(0, currentStepIndex),
          newStep,
          ...currentSteps.slice(currentStepIndex),
        ];

        // 立即更新状态以显示新步骤
        onStateUpdate?.({
          type: 'steps',
          content: '发现额外任务，动态添加新步骤...',
          steps: currentSteps,
        });

        // 给用户一点时间看到新步骤被添加
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      if (currentStepIndex < currentSteps.length) {
        // 更新状态
        onStateUpdate?.({
          type: 'steps',
          content: currentStepIndex < currentSteps.length ? '执行中...' : '执行完成',
          steps: currentSteps,
        });
      }
    }

    // 所有步骤完成后的最终更新
    onStateUpdate?.({
      type: 'steps',
      content: '所有任务已完成',
      steps: currentSteps,
    });
  }

  // Generate mock steps (preserved)
  private generateMockSteps(message: string): AgentStep[] {
    const steps: AgentStep[] = [
      {
        id: 1,
        title: '分析用户请求',
        description: `解析用户输入：「${message.substring(0, 30)}${message.length > 30 ? '...' : ''}」，确定任务类型和需求`,
        status: 'pending',
        artifactId: 'block-1', // 关联到文档工件
      },
      {
        id: 2,
        title: '收集相关信息',
        description: '检索和分析相关领域的数据，查找参考资料和最佳实践',
        status: 'pending',
        artifactId: 'block-2', // 关联到代码工件
      },
      {
        id: 3,
        title: '生成结果',
        description: '基于分析生成最终结果和建议',
        status: 'pending',
        artifactId: 'block-3', // 关联到界面工件
      },
    ];

    // 如果消息包含特定关键词，可以添加额外的步骤
    if (message.toLowerCase().includes('代码') || message.toLowerCase().includes('编程')) {
      steps.push({
        id: 6,
        title: '代码质量检查',
        description: '执行代码审查，确保代码质量和最佳实践',
        status: 'pending',
        artifactId: 'block-2', // 关联到代码工件
      });
    } else if (message.toLowerCase().includes('设计') || message.toLowerCase().includes('ui')) {
      steps.push({
        id: 6,
        title: '视觉设计优化',
        description: '应用设计原则，确保视觉一致性和用户体验',
        status: 'pending',
        artifactId: 'block-3', // 关联到界面工件
      });
    }

    return steps;
  }

  // Generate mock blocks (preserved)
  private generateMockBlocks(message: string): AgentIntermediateBlock[] {
    const blocks: AgentIntermediateBlock[] = [
      {
        id: 'block-1',
        type: 'documentation',
        title: '需求分析',
        content: `<h2>需求分析</h2><p>基于用户输入: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"></p><ul><li>主要用户需求是创建一个直观的界面</li><li>需要关注用户体验和可访问性</li><li>视觉设计应该简洁而现代</li></ul>`,
      },
      {
        id: 'block-2',
        type: 'code',
        title: '示例代码',
        content: `// 示例React组件
import React from 'react';

export const Component = () => {
  return (
    <div className="container">
      <h1>设计预览</h1>
      <div className="content">
        <p>这是根据你的要求生成的内容</p>
      </div>
    </div>
  );
};`,
      },
      {
        id: 'block-3',
        type: 'website',
        title: '界面预览',
        content: `<div style="padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h1 style="color: #333;">设计预览</h1>
        <div style="background: white; padding: 15px; border-radius: 4px; margin-top: 15px;">
          <p>这里是基于你的输入 "${message}" 创建的界面预览</p>
          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button style="background: #000; color: white; padding: 8px 16px; border: none; border-radius: 4px;">主按钮</button>
            <button style="background: #f1f1f1; padding: 8px 16px; border: 1px solid #ddd; border-radius: 4px;">次要按钮</button>
          </div>
        </div>
      </div>`,
      },
    ];

    return blocks;
  }
}

// Update the exported service to use the adapter
export const mockAgentService = new AgentServiceAdapter();
