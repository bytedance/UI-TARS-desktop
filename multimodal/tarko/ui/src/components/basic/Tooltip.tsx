import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  title: React.ReactNode;
  placement?:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'bottom-left'
    | 'bottom-right'
    | 'top-left'
    | 'top-right';
  children: React.ReactElement;
  className?: string;
  maxWidth?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  title,
  placement = 'bottom',
  children,
  className,
  maxWidth = '400px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  if (!title) {
    return children;
  }

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const offset = 8;

    let top = 0;
    let left = 0;

    switch (placement) {
      case 'top':
        top = rect.top - offset;
        left = rect.left + rect.width / 2;
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2;
        left = rect.left - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2;
        left = rect.right + offset;
        break;
      case 'bottom-left':
        top = rect.bottom + offset;
        left = rect.left;
        break;
      case 'bottom-right':
        top = rect.bottom + offset;
        left = rect.right;
        break;
      case 'top-left':
        top = rect.top - offset;
        left = rect.left;
        break;
      case 'top-right':
        top = rect.top - offset;
        left = rect.right;
        break;
    }

    // Add scroll offset
    top += window.scrollY;
    left += window.scrollX;

    setPosition({ top, left });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const getTooltipStyle = (): React.CSSProperties => {
    const titleLength = typeof title === 'string' ? title.length : 0;

    // Linear minWidth calculation: 150px + (titleLength - 20) * 3px per character
    // Min: 150px (for 20+ chars), Max: 450px (for 120+ chars)
    const dynamicMinWidth =
      titleLength < 20 ? 'auto' : `${Math.min(150 + (titleLength - 20) * 3, 450)}px`;

    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      top: position.top,
      left: position.left,
      backgroundColor: '#000000',
      color: '#ffffff',
      fontSize: '12px',
      padding: '8px 12px',
      borderRadius: '6px',
      zIndex: 9999,
      pointerEvents: 'none',
      maxWidth,
      minWidth: dynamicMinWidth,
      width: 'auto',
      whiteSpace: 'normal',
      lineHeight: '1.4',
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 150ms ease-in-out',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    };

    switch (placement) {
      case 'top':
        return { ...baseStyle, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        return { ...baseStyle, transform: 'translateX(-50%)' };
      case 'left':
        return { ...baseStyle, transform: 'translate(-100%, -50%)' };
      case 'right':
        return { ...baseStyle, transform: 'translateY(-50%)' };
      case 'bottom-left':
        return { ...baseStyle, transform: 'translateY(0)' };
      case 'bottom-right':
        return { ...baseStyle, transform: 'translate(-100%, 0)' };
      case 'top-left':
        return { ...baseStyle, transform: 'translateY(-100%)' };
      case 'top-right':
        return { ...baseStyle, transform: 'translate(-100%, -100%)' };
      default:
        return baseStyle;
    }
  };

  const tooltipElement = isVisible ? <div style={getTooltipStyle()}>{title}</div> : null;

  return (
    <>
      <div
        ref={triggerRef}
        className={className}
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
};
