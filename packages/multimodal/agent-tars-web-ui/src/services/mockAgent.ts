import type { AgentStep } from '../types/chat';

export type AgentIntermediateBlock = {
  id: string;
  type: string;
  title: string;
  content: string;
};

// 模拟聊天响应生成
export const mockAgentService = {
  streamChat: async (
    model: string,
    messages: { role: string; content: string }[],
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    options?: {
      onStateUpdate?: (state: any) => void;
    },
  ): Promise<void> => {
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

      // 根据不同的消息内容生成不同的响应
      let response = '';

      if (shouldShowSteps) {
        // 初始化步骤
        const steps = generateMockSteps(lastUserMessage);

        // 通知前端显示步骤
        options?.onStateUpdate?.({
          type: 'steps',
          content: '开始执行多步骤任务',
          steps: steps,
        });

        // 模拟步骤执行
        await simulateStepExecution(steps, options?.onStateUpdate);

        response = '我已经完成了所有步骤，以下是任务的结果摘要。';

        if (shouldShowCanvas) {
          const blocks = generateMockBlocks(lastUserMessage);
          options?.onStateUpdate?.({
            type: 'canvas',
            content: '展示设计视图',
            blocks: blocks,
          });
          response += '你可以在右侧面板查看详细的分析结果。';
        }
      } else if (shouldShowCanvas) {
        // 触发 Canvas 视图
        const blocks = generateMockBlocks(lastUserMessage);

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
  },
};

// 模拟步骤执行过程
async function simulateStepExecution(
  steps: AgentStep[],
  onStateUpdate?: (state: any) => void,
): Promise<void> {
  // 开始第一个步骤
  let currentStepIndex = 0;

  while (currentStepIndex < steps.length) {
    const updatedSteps = [...steps];
    updatedSteps[currentStepIndex].status = 'in-progress';

    // 更新状态
    onStateUpdate?.({
      type: 'steps',
      content: '执行中...',
      steps: updatedSteps,
    });

    // 模拟步骤执行时间 (1-3秒)
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

    // 步骤完成
    updatedSteps[currentStepIndex].status = 'completed';

    // 准备下一个步骤
    currentStepIndex++;

    if (currentStepIndex < steps.length) {
      updatedSteps[currentStepIndex].status = 'pending';
    }

    // 更新状态
    onStateUpdate?.({
      type: 'steps',
      content: currentStepIndex < steps.length ? '执行中...' : '执行完成',
      steps: updatedSteps,
    });
  }
}

// 生成模拟的步骤数据
function generateMockSteps(message: string): AgentStep[] {
  const steps: AgentStep[] = [
    {
      id: 1,
      title: '分析用户请求',
      description: `解析用户输入：「${message.substring(0, 30)}${message.length > 30 ? '...' : ''}」，确定任务类型和需求`,
      status: 'pending',
    },
    {
      id: 2,
      title: '收集相关信息',
      description: '检索和分析相关领域的数据，查找参考资料和最佳实践',
      status: 'pending',
    },
    {
      id: 3,
      title: '生成初步方案',
      description: '基于收集的信息，创建初步解决方案框架',
      status: 'pending',
    },
    {
      id: 4,
      title: '优化方案细节',
      description: '调整和细化方案的各个方面，确保全面性和准确性',
      status: 'pending',
    },
    {
      id: 5,
      title: '生成最终结果',
      description: '组织整合所有内容，形成完整的响应',
      status: 'pending',
    },
  ];

  // 如果消息包含特定关键词，可以添加额外的步骤
  if (message.toLowerCase().includes('代码') || message.toLowerCase().includes('编程')) {
    steps.push({
      id: 6,
      title: '代码质量检查',
      description: '执行代码审查，确保代码质量和最佳实践',
      status: 'pending',
    });
  } else if (message.toLowerCase().includes('设计') || message.toLowerCase().includes('ui')) {
    steps.push({
      id: 6,
      title: '视觉设计优化',
      description: '应用设计原则，确保视觉一致性和用户体验',
      status: 'pending',
    });
  }

  return steps;
}

// 生成模拟的设计块数据
function generateMockBlocks(message: string): AgentIntermediateBlock[] {
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
