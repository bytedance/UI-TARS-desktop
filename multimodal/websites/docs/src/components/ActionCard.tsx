import React from 'react';
import { Link } from './Link';
import './QuickStartActionCard.css';

/**
 * ActionCard Component - A reusable card component that supports various themes and custom styles
 *
 * @example Basic Usage
 * ```tsx
 * <ActionCard
 *   title="Get Started"
 *   description="Get a quick guide to using our product"
 *   icon="🚀"
 *   href="/get-started"
 * />
 * ```
 *
 * @example Using Predefined Themes
 * ```tsx
 * <ActionCard
 *   title="API Reference"
 *   description="View the complete API documentation"
 *   icon="📚"
 *   href="/api"
 *   color="purple" // Predefined themes: green, purple, blue, orange, red, gray
 * />
 * ```
 *
 * @example Using Custom Colors
 * ```tsx
 * <ActionCard
 *   title="Advanced Tutorial"
 *   description="Dive deeper into advanced features"
 *   icon="⚙️"
 *   href="/advanced"
 *   color="#ff6b6b" // Using custom color value
 * />
 * ```
 *
 * @example Using Click Event Instead of Link
 * ```tsx
 * <ActionCard
 *   title="Open console"
 *   description="Open developer console"
 *   icon="💻"
 *   onClick={() => console.log('Card clicked!')}
 * />
 * ```
 *
 * @example Hide Arrow
 * ```tsx
 * <ActionCard
 *   title="Information card"
 *   description="This is a pure information display card"
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
   *Card description
   */
  description: string;

  /**
   * Card icon, can be emoji or React node
   */
  icon: React.ReactNode;

  /**
   *Card link
   */
  href?: string;

  /**
   * Whether to force the use of traditional link jump methods, even if it is a relative path
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

  // Handle click event
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
      e.preventDefault(); // Prevent link navigation
    }
  };

  // Render as an anchor tag or div based on whether there's a link
  if (href) {
    return (
      <Link
        href={href}
        className={`quick-action-card ${className}`}
        style={{ '--card-color': cardColor } as React.CSSProperties}
        onClick={handleClick}
        forceTraditionalLink={forceTraditionalLink}
      >
        {cardContent}
      </Link>
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
