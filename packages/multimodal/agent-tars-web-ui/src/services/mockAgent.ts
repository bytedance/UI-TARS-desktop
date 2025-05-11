import { Message } from '@multimodal/ui';

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
      if (shouldShowCanvas) {
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

// 生成模拟的设计块数据
function generateMockBlocks(message: string): AgentIntermediateBlock[] {
  const blocks: AgentIntermediateBlock[] = [
    {
      id: 'block-1',
      type: 'documentation',
      title: '需求分析',
      content: `<h2>需求分析</h2><p>基于用户输入: "${message}"</p><ul><li>主要用户需求是创建一个直观的界面</li><li>需要关注用户体验和可访问性</li><li>视觉设计应该简洁而现代</li></ul>`,
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
