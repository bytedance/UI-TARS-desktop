import React from 'react';
import { useNavigate } from 'rspress/runtime';
import './QuickStartActionCard.css';

/**
 * ActionCard Component - A reusable card component that supports various themes and custom styles
 *
 * @example Basic Usage
 * ```tsx
 * <ActionCard
 *   title="开始使用"
 *   description="快速了解如何使用我们的产品"
 *   icon="🚀"
 *   href="/get-started"
 * />
 * ```
 *
 * @example Using Predefined Themes
 * ```tsx
 * <ActionCard
 *   title="API 参考"
 *   description="查看完整的 API 文档"
 *   icon="📚"
 *   href="/api"
 *   color="purple" // Predefined themes: green, purple, blue, orange, red, gray
 * />
 * ```
 *
 * @example Using Custom Colors
 * ```tsx
 * <ActionCard
 *   title="高级教程"
 *   description="深入了解高级功能"
 *   icon="⚙️"
 *   href="/advanced"
 *   color="#ff6b6b" // Using custom color value
 * />
 * ```
 *
 * @example Using Click Event Instead of Link
 * ```tsx
 * <ActionCard
 *   title="打开控制台"
 *   description="打开开发者控制台"
 *   icon="💻"
 *   onClick={() => console.log('Card clicked!')}
 * />
 * ```
 *
 * @example Hide Arrow
 * ```tsx
 * <ActionCard
 *   title="信息卡片"
 *   description="这是一个纯信息展示卡片"
 *   icon="ℹ️"
 *   showArrow={false}
 * />
 * ```
 */
export interface ActionCardProps {
  /**
   * Card title
   */
  title: string;

  /**
   * Card description
   */
  description: string;

  /**
   * Card icon, can be emoji or React node
   */
  icon: React.ReactNode;

  /**
   * Card link
   */
  href?: string;

  /**
   * 是否强制使用传统链接跳转方式，即使是相对路径
   * @default false
   */
  forceTraditionalLink?: boolean;

  /**
   * Card color, can be predefined theme or custom color value
   */
  color?: string | keyof typeof CARD_THEMES;

  /**
   * Callback function when card is clicked
   */
  onClick?: () => void;

  /**
   * Whether to show the arrow
   * @default true
   */
  showArrow?: boolean;

  /**
   * Custom class name
   */
  className?: string;
}

// Predefined color themes
export const CARD_THEMES = {
  green: 'linear-gradient(135deg, #34d399 0%, #0ea5e9 100%)',
  purple: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  blue: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
  orange: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
  red: 'linear-gradient(135deg, #ef4444 0%, #f43f5e 100%)',
  gray: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
};

export function ActionCard({
  title,
  description,
  icon,
  href,
  color = 'green',
  onClick,
  showArrow = true,
  className = '',
  forceTraditionalLink = false,
}: ActionCardProps) {
  const navigate = useNavigate();
  // Determine card color
  const cardColor = CARD_THEMES[color as keyof typeof CARD_THEMES] || color;

  // Create basic card content
  const cardContent = (
    <>
      <div className="card-icon">{icon}</div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
      </div>
      {showArrow && <div className="card-arrow">→</div>}
    </>
  );

  // 检查链接是否为外部链接
  const isExternalLink = href?.startsWith('http') || href?.startsWith('//');

  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      return;
    }

    if (href) {
      if (!isExternalLink && !forceTraditionalLink) {
        e.preventDefault();
        navigate(href);
      }
    }
  };

  // Render as an anchor tag or div based on whether there's a link
  if (href) {
    return (
      <a
        href={href}
        className={`quick-action-card ${className}`}
        style={{ '--card-color': cardColor } as React.CSSProperties}
        onClick={handleClick}
        // 如果是内部链接且不强制使用传统方式，则不需要target属性
        {...(isExternalLink ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div
      className={`quick-action-card ${className}`}
      style={{ '--card-color': cardColor } as React.CSSProperties}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {cardContent}
    </div>
  );
}
