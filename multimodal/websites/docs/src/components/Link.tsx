import React from 'react';
import { useNavigate } from 'rspress/runtime';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useCursor } from './CursorContext';

export interface LinkProps extends Omit<HTMLMotionProps<'a'>, 'href'> {
  /**
   * Link URL
   */
  href: string;

  /**
   * Whether to force traditional link navigation even for relative paths
   * @default false
   */
  forceTraditionalLink?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Child elements
   */
  children: React.ReactNode;

  /**
   * Whether to apply cursor hover effect
   * @default true
   */
  applyCursorEffect?: boolean;
}

/**
 * Universal link component that automatically detects link type and uses appropriate navigation method
 * Enhanced with motion capabilities from framer-motion
 *
 * - External links (starting with http:// or https:// or //): Uses traditional link navigation
 * - Internal links (relative paths): Uses React Router's useNavigate for frontend routing
 * - Can force traditional link navigation via forceTraditionalLink prop
 * - Supports all framer-motion animation props
 *
 * @example
 * ```tsx
 * <Link href="/guide/introduction">Guide</Link>
 * <Link href="https://example.com" target="_blank">External Link</Link>
 * <Link href="/download" forceTraditionalLink>Force Traditional Navigation</Link>
 * <Link
 *   href="/animated-link"
 *   whileHover={{ scale: 1.05 }}
 *   transition={{ duration: 0.2 }}
 * >
 *   Animated Link
 * </Link>
 * ```
 */
export const Link: React.FC<LinkProps> = ({
  href,
  forceTraditionalLink = false,
  className = '',
  onClick,
  children,
  applyCursorEffect = true,
  ...rest
}) => {
  const navigate = useNavigate();
  const { setIsHovered } = useCursor();

  // Check if the link is external
  const isExternalLink =
    href?.startsWith('http') || href?.startsWith('//') || href?.startsWith('#');

  // Handle cursor hover effect
  const handleMouseEnter = () => {
    if (applyCursorEffect) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (applyCursorEffect) {
      setIsHovered(false);
    }
  };

  // Handle click event
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    // If custom onClick handler is provided, execute it first
    if (onClick) {
      onClick(e);
    }

    // If click has been prevented (e.g. preventDefault() called in custom onClick), don't process further
    if (e.defaultPrevented) {
      return;
    }

    // If internal link and not forcing traditional navigation, use React Router navigation
    if (href && !isExternalLink && !forceTraditionalLink) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <motion.a
      href={href}
      className={className}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      // If external link, add relevant attributes
      {...(isExternalLink ? { target: rest.target || '_blank', rel: 'noopener noreferrer' } : {})}
      {...rest}
    >
      {children}
    </motion.a>
  );
};
