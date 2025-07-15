import React, { ReactNode } from 'react';
import './QuickStartActionCard.css'; // 重用现有的 CSS

/**
 * ActionCardContainer - 用于灵活展示多个 ActionCard 组件
 *
 * @example
 * // 基本使用方法
 * <ActionCardContainer>
 *   <ActionCard
 *     title="开始使用"
 *     description="快速上手指南"
 *     icon="🚀"
 *     href="/getting-started"
 *     color="blue"
 *   />
 *   <ActionCard
 *     title="API 文档"
 *     description="查看完整 API 参考"
 *     icon="📚"
 *     href="/api"
 *     color="purple"
 *   />
 * </ActionCardContainer>
 *
 * @example
 * // 自定义布局参数
 * <ActionCardContainer minCardWidth="250px" gap="2rem" margin="3rem 0">
 *   ...
 * </ActionCardContainer>
 */
interface ActionCardContainerProps {
  /**
   * 子元素，通常是 ActionCard 组件
   */
  children: ReactNode;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 最小卡片宽度，用于响应式布局
   * @default 300px
   */
  minCardWidth?: string;

  /**
   * 卡片之间的间距
   * @default 1.5rem
   */
  gap?: string;

  /**
   * 容器外边距
   * @default 2rem 0
   */
  margin?: string;
}

export function ActionCardContainer({
  children,
  className = '',
  minCardWidth = '300px',
  gap = '1.5rem',
  margin = '2rem 0',
}: ActionCardContainerProps) {
  return (
    <div
      className={`action-card-container ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}, 1fr))`,
        gap,
        margin,
      }}
    >
      {children}
    </div>
  );
}
