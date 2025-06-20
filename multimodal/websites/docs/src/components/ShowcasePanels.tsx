import React, { ReactNode } from 'react';

type PanelItem = {
  content: ReactNode;
  title: string;
  link?: string;
  height?: string | number; // 添加单独面板的高度控制
};

interface ShowcasePanelsProps {
  panels: PanelItem[];
  className?: string;
  defaultHeight?: string | number; // 添加默认高度设置
  equalHeight?: boolean; // 控制是否强制等高
}

export function ShowcasePanels({
  panels,
  className = '',
  defaultHeight,
  equalHeight = true,
}: ShowcasePanelsProps) {
  return (
    <div className={`flex flex-col md:flex-row gap-6 w-full ${className}`}>
      {panels.map((panel, index) => {
        // 确定每个面板的高度 - 优先使用面板自身高度，其次是默认高度
        const contentHeight = panel.height || defaultHeight;

        // 根据是否强制等高决定内容容器的样式
        const contentStyle =
          equalHeight || contentHeight ? { height: contentHeight, overflow: 'hidden' } : {};

        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full rounded-lg overflow-hidden shadow-md mb-3" style={contentStyle}>
              <div className={`w-full h-full ${!contentHeight ? 'h-auto' : ''}`}>
                {panel.content}
              </div>
            </div>
            <div className="text-center text-blue-500 text-sm mt-2">
              {panel.link ? (
                <a href={panel.link} target="_blank" rel="noopener noreferrer">
                  {panel.title}
                </a>
              ) : (
                <span>{panel.title}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
