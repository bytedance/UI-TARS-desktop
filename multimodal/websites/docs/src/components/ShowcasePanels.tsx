import React, { ReactNode, useEffect, useState } from 'react';

// 定义响应式高度类型
type ResponsiveHeight = {
  default: string | number;
  mobile?: string | number;
  tablet?: string | number;
};

type PanelItem = {
  content: ReactNode;
  title: string;
  link?: string;
  height?: string | number | ResponsiveHeight; // 支持响应式高度
};

interface ShowcasePanelsProps {
  panels: PanelItem[];
  className?: string;
  defaultHeight?: string | number | ResponsiveHeight; // 支持响应式高度
  equalHeight?: boolean; // 控制是否强制等高
}

export function ShowcasePanels({
  panels,
  className = '',
  defaultHeight,
  equalHeight = true,
}: ShowcasePanelsProps) {
  const [isMobile, setIsMobile] = useState(false);

  // 检测设备类型
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 解析响应式高度
  const getResponsiveHeight = (height?: string | number | ResponsiveHeight) => {
    if (!height) return undefined;

    if (typeof height === 'string' || typeof height === 'number') {
      return height;
    }
    // 是响应式对象
    return isMobile && height.mobile ? height.mobile : height.default;
  };

  // 检查默认高度是否小于100px
  const isSmallHeight = () => {
    const height = getResponsiveHeight(defaultHeight);
    if (typeof height === 'number') {
      return height < 100;
    }
    if (typeof height === 'string') {
      // 处理'100px'这样的字符串
      const numValue = parseInt(height);
      return !isNaN(numValue) && numValue < 100;
    }
    return false;
  };

  // 根据高度决定移动端布局方式
  const useGridForMobile = isSmallHeight();

  return (
    <div
      className={`flex ${useGridForMobile ? 'flex-row flex-wrap' : 'flex-col'} md:flex-row gap-6 w-full ${className}`}
    >
      {panels.map((panel, index) => {
        // 确定每个面板的高度 - 优先使用面板自身高度，其次是默认高度
        const panelHeight = getResponsiveHeight(panel.height);
        const contentHeight = panelHeight || getResponsiveHeight(defaultHeight);

        // 根据是否强制等高决定内容容器的样式
        const contentStyle =
          equalHeight || contentHeight ? { height: contentHeight, overflow: 'hidden' } : {};

        return (
          <div
            key={index}
            className={`${useGridForMobile && isMobile ? 'w-[calc(50%-0.75rem)]' : 'flex-1'} flex flex-col items-center`}
          >
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
